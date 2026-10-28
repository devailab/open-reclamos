package app

import (
	"bufio"
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/riverqueue/river"
	"gorm.io/gorm"
	"openreclamos.com/api/internal/modules/complaints/feature/exports"
	"openreclamos.com/api/internal/shared/config"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/httpclient"
	"openreclamos.com/api/internal/shared/jobs"
	"openreclamos.com/api/internal/shared/mailer"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/storage"
	"openreclamos.com/api/internal/shared/utils"
)

func TestWorkersWebhookAndQueuedExport(t *testing.T) {
	forEachDatabase(t, func(t *testing.T, db *gorm.DB) {
		ctx := context.Background()
		s := New(db, configForWorkerTest(t))

		if err := s.StartWorkers(ctx); err != nil {
			t.Fatal(err)
		}

		registered, err := s.Identity.Session.CreateAccount(
			ctx,
			operation.Input{
				Data: map[string]any{
					"name": "Worker", "last_name": "Prueba",
					"email":         "worker-" + utils.NewID() + "@example.com",
					"password":      "Worker-password-seguro-2026",
					"document_type": "DNI", "document_number": utils.NewID()[:20],
				},
			},
		)
		if err != nil {
			t.Fatal(err)
		}

		header := accessTokenHeader(registered)
		p, err := s.Auth.Authenticate(ctx, header)
		if err != nil {
			t.Fatal(err)
		}

		districts, err := s.Repo.SearchUbigeos(ctx, "LIMA")
		if err != nil {
			t.Fatal(err)
		}

		tax := "23" + time.Now().Format("150405000")

		organization, err := s.Organizations.Organizations.Create(
			ctx,
			p,
			operation.Input{
				Data: map[string]any{
					"name":         "Workers",
					"legal_name":   "Workers SAC",
					"tax_id":       tax,
					"slug":         "workers-" + utils.NewID(),
					"ubigeo_id":    districts[0].ID,
					"address_type": "CALLE",
					"address":      "Lima",
				},
			},
		)
		if err != nil {
			t.Fatal(err)
		}

		p.OrganizationID = utils.PublicData(organization.Data)["id"].(string)
		p, err = s.Auth.Tenant(ctx, p, p.OrganizationID)
		if err != nil {
			t.Fatal(err)
		}

		store, err := s.Catalogs.Stores.Create(
			ctx,
			p,
			operation.Input{Data: map[string]any{"name": "Tienda", "type": "virtual", "color": "#2563EB"}},
		)
		if err != nil {
			t.Fatal(err)
		}

		storeID := utils.PublicData(store.Data)["id"].(string)
		secret := "worker-webhook-secret"
		var deliveries atomic.Int32
		var signatureValid atomic.Bool

		target := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			body, _ := io.ReadAll(r.Body)
			mac := hmac.New(sha256.New, []byte(secret))

			mac.Write([]byte(r.Header.Get("X-Webhook-Timestamp") + "." + string(body)))
			signatureValid.Store(r.Header.Get("X-Webhook-Signature") == "sha256="+hex.EncodeToString(mac.Sum(nil)))
			deliveries.Add(1)
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("recibido"))
		}))
		defer target.Close()

		// Inyectar el transporte del proveedor de pruebas, sin relajar el de producción.
		s.HTTP.Transport = target.Client().Transport.(*http.Transport)
		endpointID := utils.NewID()
		encrypted, err := utils.Encrypt(s.Config.WebhookEncryptionKey, endpointID, secret)
		if err != nil {
			t.Fatal(err)
		}

		_, err = s.Repo.CreateWebhook(
			ctx,
			repository.CreateWebhookParams{
				ID:              endpointID,
				OrganizationID:  p.OrganizationID,
				Name:            "Destino",
				Slug:            "target-" + endpointID,
				TargetUrl:       target.URL,
				Events:          utils.JSONBytes([]string{"complaint.submitted"}),
				Status:          "active",
				SecretEncrypted: &encrypted,
				TimeoutMs:       5000,
				CreatedBy:       &p.UserID,
			},
		)
		if err != nil {
			t.Fatal(err)
		}

		complaintID := utils.NewID()

		err = s.Transaction(ctx, func(q *repository.Repository) error {
			err := q.CreateComplaint(ctx, &models.Complaint{
				ID:                   complaintID,
				OrganizationID:       p.OrganizationID,
				StoreID:              storeID,
				Status:               "open",
				Priority:             "medium",
				TrackingCode:         utils.Token(),
				Correlative:          "0001",
				FirstName:            "María",
				LastName:             "Pérez",
				Email:                "consumer@example.com",
				DocumentType:         "DNI",
				DocumentNumber:       "12345678",
				PersonType:           "natural",
				Type:                 "claim",
				ResponseDeadlineDays: 15,
				ResponseDeadline:     time.Now().Add(24 * time.Hour),
			})
			if err != nil {
				return err
			}

			return s.Jobs.EnqueueEvent(
				ctx,
				q,
				p.OrganizationID,
				complaintID,
				"complaint.submitted",
				map[string]string{"status": "open"},
			)
		})
		if err != nil {
			t.Fatal(err)
		}

		records, err := s.Repo.ListWebhookDeliveries(ctx, p.OrganizationID)
		if err != nil || len(records) != 1 {
			t.Fatal("no se persistió la entrega", err)
		}

		args := jobs.WebhookArgs{OrganizationID: p.OrganizationID, DeliveryID: records[0].ID}

		if err = s.Integrations.Webhooks.Deliver(ctx, args); err != nil {
			t.Fatal(err)
		}

		if err = s.Integrations.Webhooks.Deliver(ctx, args); err != nil {
			t.Fatal(err)
		}

		if deliveries.Load() != 1 || !signatureValid.Load() {
			t.Fatal("firma inválida o entrega duplicada")
		}

		queued, err := s.Complaints.Exports.Export(
			ctx,
			p,
			operation.Input{
				Data:     map[string]any{"format": "xlsx", "async": true},
				Filters:  map[string]any{},
				Page:     1,
				PageSize: 20,
			},
		)
		if err != nil {
			t.Fatal(err)
		}

		exportID := utils.PublicData(queued.Data)["id"].(string)
		worker := exports.Worker{Feature: s.Complaints.Exports}

		if err = worker.Work(ctx, &river.Job[jobs.ExportArgs]{Args: jobs.ExportArgs{OrganizationID: p.OrganizationID, ExportID: exportID}}); err != nil {
			t.Fatal(err)
		}

		export, err := s.Complaints.Exports.Authorized(ctx, p, exportID)
		if err != nil || export.Status != "completed" {
			t.Fatal("exportación no completada", err)
		}

		data, err := s.Storage.Get(ctx, utils.Value(export.StorageKey))
		if err != nil || !bytes.HasPrefix(data, []byte("PK")) {
			t.Fatal("XLSX del worker inválido", err)
		}
	})
}

func configForWorkerTest(t *testing.T) config.Config {
	return config.Config{
		AllowPublicRegistration: true,
		PublicBaseURL:           "http://localhost:8080",
		StorageDriver:           "local",
		StorageLocalDir:         t.TempDir(),
		WebhookEncryptionKey:    base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{4}, 32)),
	}
}

func TestNetworkAndEncryptionBoundaries(t *testing.T) {
	key := base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{5}, 32))
	encrypted, err := utils.Encrypt(key, "company-a", "secret")
	if err != nil {
		t.Fatal(err)
	}

	if _, err = utils.Decrypt(key, "company-b", encrypted); err == nil {
		t.Fatal("se pudo intercambiar el secreto entre empresas")
	}

	for _, address := range []string{"127.0.0.1", "10.0.0.1", "169.254.169.254", "::1"} {
		if err = httpclient.PublicHost(context.Background(), address); err == nil {
			t.Fatalf("se aceptó destino privado %s", address)
		}
	}

	for _, key := range []string{"../secret", "/etc/passwd", "uploads/../secret", "uploads\\secret"} {
		if storage.SafeKey(key) {
			t.Fatalf("clave no confinada: %s", key)
		}
	}
}

// fakeSMTP levanta un servidor SMTP mínimo que publica cada mensaje recibido.
func fakeSMTP(t *testing.T) (string, string, <-chan string) {
	t.Helper()

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}

	t.Cleanup(func() { listener.Close() })

	messages := make(chan string, 8)

	go func() {
		for {
			connection, err := listener.Accept()
			if err != nil {
				return
			}

			go serveSMTP(connection, messages)
		}
	}()

	host, port, _ := net.SplitHostPort(listener.Addr().String())

	return host, port, messages
}

// serveSMTP atiende una conexión y publica el cuerpo de cada mensaje recibido.
func serveSMTP(connection net.Conn, messages chan<- string) {
	defer connection.Close()

	connection.SetDeadline(time.Now().Add(10 * time.Second))

	reader := bufio.NewReader(connection)

	io.WriteString(connection, "220 localhost ESMTP\r\n")

	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			return
		}

		switch {
		case strings.HasPrefix(line, "EHLO"), strings.HasPrefix(line, "HELO"):
			io.WriteString(connection, "250 localhost\r\n")

		case strings.HasPrefix(line, "MAIL"), strings.HasPrefix(line, "RCPT"):
			io.WriteString(connection, "250 OK\r\n")

		case strings.HasPrefix(line, "DATA"):
			io.WriteString(connection, "354 Continue\r\n")

			var body strings.Builder

			for {
				part, err := reader.ReadString('\n')
				if err != nil {
					return
				}

				if part == ".\r\n" {
					break
				}

				body.WriteString(part)
			}

			messages <- body.String()
			io.WriteString(connection, "250 Accepted\r\n")

		case strings.HasPrefix(line, "QUIT"):
			io.WriteString(connection, "221 Goodbye\r\n")

			return

		default:
			io.WriteString(connection, "250 OK\r\n")
		}
	}
}

func TestSMTPMultipartDelivery(t *testing.T) {
	host, port, messages := fakeSMTP(t)

	s := New(
		nil,
		config.Config{
			SMTPEnabled: true,
			SMTPHost:    host,
			SMTPPort:    port,
			SMTPFrom:    "sender@example.com",
			SMTPTLSMode: "none",
		},
	)

	err := s.Mailer.Send(
		context.Background(),
		"consumer@example.com",
		"Constancia de María",
		"Tu reclamo está registrado.",
		&mailer.Attachment{Name: "constancia.pdf", Data: []byte("%PDF-1.4\nfixture")},
	)
	if err != nil {
		t.Fatal(err)
	}

	select {
	case message := <-messages:
		if !strings.Contains(message, "multipart/mixed") || !strings.Contains(message, "application/pdf") ||
			!strings.Contains(message, base64.StdEncoding.EncodeToString([]byte("%PDF-1.4\nfixture"))) {
			t.Fatal("mensaje MIME inválido")
		}

	case <-time.After(10 * time.Second):
		t.Fatal("el servidor SMTP no recibió el mensaje")
	}
}
