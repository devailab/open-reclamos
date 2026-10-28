package app

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"testing"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	"github.com/riverqueue/river"
	"gorm.io/gorm"
	backendv1 "openreclamos.com/api/gen/openreclamos/backend/v1"
	"openreclamos.com/api/internal/modules/identity/feature/installation"
	"openreclamos.com/api/internal/shared/config"
	"openreclamos.com/api/internal/shared/database/databasetest"
	"openreclamos.com/api/internal/shared/jobs"
)

type rpcTestResult struct {
	Data        map[string]any `json:"data"`
	Document    string         `json:"document"`
	AccessToken string         `json:"accessToken"`
}

// pone el token en cada petición del cliente
type bearerTestTransport struct {
	mu    sync.RWMutex
	token string
}

func (transport *bearerTestTransport) RoundTrip(request *http.Request) (*http.Response, error) {
	request = request.Clone(request.Context())

	transport.mu.RLock()

	if transport.token != "" && request.Header.Get("Authorization") == "" {
		request.Header.Set("Authorization", "Bearer "+transport.token)
	}

	transport.mu.RUnlock()

	return http.DefaultTransport.RoundTrip(request)
}

// ejecuta la prueba completa en cada base de datos
func TestBackendAgainstDatabases(t *testing.T) {
	databasetest.Run(t, databasetest.Options{}, testBackend)
}

// prueba todo el camino: registro, tiendas, reclamos, respuestas, pdf, api y mcp
func testBackend(t *testing.T, db *gorm.DB) {
	ctx := context.Background()
	storageDir := t.TempDir()

	cfg := config.Config{
		AppName: "Prueba", AllowPublicRegistration: true, PublicBaseURL: "http://localhost:8080",
		StorageDriver: "local", StorageLocalDir: storageDir, DocumentLookupProvider: "none",
		SSOEncryptionKey:     base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{1}, 32)),
		WebhookEncryptionKey: base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{2}, 32)),
	}

	s := New(db, cfg)

	if err := s.StartWorkers(ctx); err != nil {
		t.Fatal(err)
	}

	server := httptest.NewServer(s.Handler("test"))
	defer server.Close()

	client := func() *http.Client {
		jar, _ := cookiejar.New(nil)

		return &http.Client{Jar: jar, Transport: &bearerTestTransport{}}
	}

	// cuatro clientes, cada uno con sus cookies: dueño, lector, otra empresa y público
	owner, reader, other, public := client(), client(), client(), client()

	// llama a un método rpc y revisa que el status sea el esperado
	rpc := func(c *http.Client, method, id string, data map[string]any, want int) rpcTestResult {
		t.Helper()

		body, _ := json.Marshal(map[string]any{"id": id, "data": data})

		request, _ := http.NewRequest(
			http.MethodPost,
			server.URL+"/rpc/openreclamos.backend.v1.BackendService/"+method,
			bytes.NewReader(body),
		)

		request.Header.Set("Content-Type", "application/json")

		response, err := c.Do(request)
		if err != nil {
			t.Fatal(err)
		}

		defer response.Body.Close()

		payload, _ := io.ReadAll(response.Body)

		if response.StatusCode != want {
			t.Fatalf("%s: status %d, esperado %d: %s", method, response.StatusCode, want, payload)
		}

		var out rpcTestResult
		if want == 200 && json.Unmarshal(payload, &out) != nil {
			t.Fatalf("%s no devolvió JSON válido", method)
		}

		if out.AccessToken != "" || method == "Logout" {
			transport := c.Transport.(*bearerTestTransport)

			transport.mu.Lock()

			transport.token = out.AccessToken

			transport.mu.Unlock()
		}

		return out
	}

	// Todos los métodos declarados deben tener una implementación de dominio.
	methods := backendv1.File_openreclamos_backend_v1_backend_proto.Services().Get(0).Methods()
	implemented := s.Registry.Names()
	if methods.Len() != len(implemented) {
		t.Fatalf("contrato %d, implementaciones %d", methods.Len(), len(implemented))
	}

	for i := 0; i < methods.Len(); i++ {
		if !slices.Contains(implemented, string(methods.Get(i).Name())) {
			t.Fatal("operación faltante", methods.Get(i).Name())
		}
	}

	// texto único para no chocar con datos de otras pruebas
	suffix := uuid.NewString()[:8]
	password := "Una-contraseña-segura-2026"
	ownerEmail := "owner-" + suffix + "@example.com"

	// si no hay usuarios, primero crea el admin de la plataforma
	if count, err := s.Repo.CountUsers(ctx); err != nil {
		t.Fatal(err)
	} else if count == 0 {
		if err := s.Bootstrap(ctx, installation.Admin{Name: "Plataforma", LastName: "Prueba", Email: "platform-" + suffix + "@example.com", Password: password, DocumentType: "DNI", DocumentNumber: "9" + suffix}); err != nil && connect.CodeOf(err) != connect.CodeFailedPrecondition {
			t.Fatal(err)
		}
	}

	ownerUser := rpc(owner, "Register", "", map[string]any{"name": "Administrador", "last_name": "Prueba", "email": ownerEmail, "password": password, "document_type": "DNI", "document_number": "0" + suffix}, 200).Data["user"].(map[string]any)
	ubigeos, err := s.Repo.SearchUbigeos(ctx, "LIMA")
	if err != nil || len(ubigeos) == 0 {
		t.Fatal("faltan ubigeos", err)
	}

	orgInput := map[string]any{
		"name":         "Empresa A",
		"legal_name":   "Empresa A SAC",
		"tax_id":       "20" + digits(suffix),
		"slug":         "company-" + suffix,
		"ubigeo_id":    ubigeos[0].ID,
		"address_type": "CALLE",
		"address":      "Dirección 123",
	}

	org := rpc(owner, "CreateOrganization", "", orgInput, 200).Data

	store := rpc(
		owner,
		"CreateStore",
		"",
		map[string]any{"name": "Tienda virtual", "type": "virtual", "color": "#2563EB"},
		200,
	).Data

	store2 := rpc(
		owner,
		"CreateStore",
		"",
		map[string]any{
			"name":         "Tienda física",
			"type":         "physical",
			"color":        "#123456",
			"ubigeo_id":    ubigeos[0].ID,
			"address_type": "CALLE",
			"address":      "Otra dirección",
		},
		200,
	).Data

	category := rpc(owner, "CreateCategory", "", map[string]any{"name": "Atención"}, 200).Data
	parent := rpc(owner, "CreateReason", "", map[string]any{"reason": "Atención"}, 200).Data
	child := rpc(owner, "CreateReason", "", map[string]any{"reason": "Demora", "parent_id": parent["id"]}, 200).Data

	rpc(
		owner,
		"UpdateReason",
		parent["id"].(string),
		map[string]any{"reason": "Atención", "parent_id": child["id"]},
		400,
	)

	// invita a un lector que solo ve una tienda
	readerEmail := "reader-" + suffix + "@example.com"

	invitation := rpc(
		owner,
		"CreateInvitation",
		"",
		map[string]any{
			"email":             readerEmail,
			"role":              "viewer",
			"store_access_mode": "selected",
			"store_ids":         []any{store["id"]},
		},
		200,
	).Data

	rpc(public, "GetInvitation", invitation["token"].(string), nil, 200)
	rpc(owner, "SendInvitationEmail", "", map[string]any{"token": invitation["token"]}, 200)

	rpc(
		reader,
		"AcceptInvitation",
		invitation["token"].(string),
		map[string]any{
			"email":           readerEmail,
			"name":            "Lector",
			"last_name":       "Prueba",
			"password":        password,
			"document_type":   "DNI",
			"document_number": "1" + suffix,
		},
		200,
	)

	// Restricción por tienda y protección del último administrador.
	rpc(reader, "GetStore", store2["id"].(string), nil, 403)

	rpc(
		owner,
		"UpdateUserAccess",
		ownerUser["id"].(string),
		map[string]any{"role": "viewer", "store_access_mode": "all"},
		400,
	)

	// crea un webhook para revisar después que el rollback no deja jobs
	webhook := rpc(
		owner,
		"CreateWebhook",
		"",
		map[string]any{
			"name":       "Integración",
			"target_url": "https://93.184.216.34/hook",
			"events":     []any{"complaint.submitted"},
			"status":     "active",
			"secret":     "secret-test-16-bytes",
		},
		200,
	).Data
	if webhook["id"] == nil {
		t.Fatal("webhook sin ID")
	}

	// Carga pública con token de reclamación del archivo.
	var form bytes.Buffer
	writer := multipart.NewWriter(&form)
	_ = writer.WriteField("store_slug", store["slug"].(string))
	part, _ := writer.CreateFormFile("file", "prueba.pdf")
	_, _ = part.Write([]byte("%PDF-1.4\nprueba de adjunto"))
	_ = writer.Close()
	request, _ := http.NewRequest(http.MethodPost, server.URL+"/api/complaints/upload", &form)

	request.Header.Set("Content-Type", writer.FormDataContentType())

	uploadResponse, err := public.Do(request)
	if err != nil {
		t.Fatal(err)
	}

	var upload map[string]any

	json.NewDecoder(uploadResponse.Body).Decode(&upload)
	uploadResponse.Body.Close()

	if uploadResponse.StatusCode != 200 {
		t.Fatalf("upload: %d %v", uploadResponse.StatusCode, upload)
	}

	submission := map[string]any{
		"organization_slug": org["slug"],
		"store_slug":        store["slug"],
		"person_type":       "natural",
		"first_name":        "María",
		"last_name":         "Pérez",
		"document_type":     "DNI",
		"document_number":   "00012345",
		"email":             "consumer@example.com",
		"type":              "claim",
		"amount":            "12.50",
		"currency":          "PEN",
		"description":       "Descripción con acentos",
		"request":           "Solicito una respuesta",
		"files":             []any{map[string]any{"id": upload["id"], "token": upload["token"]}},
	}

	// Duplicar un adjunto hace rollback de todo el reclamo/correlativo/jobs.
	bad := map[string]any{}

	for k, v := range submission {
		bad[k] = v
	}

	bad["files"] = []any{
		map[string]any{"id": upload["id"], "token": upload["token"]},
		map[string]any{"id": upload["id"], "token": upload["token"]},
	}

	rpc(public, "SubmitComplaint", "", bad, 404)

	created := rpc(public, "SubmitComplaint", "", submission, 200).Data
	if created["correlative"] != "0001" {
		t.Fatalf("el rollback no revirtió el correlativo: %v", created)
	}

	tracking := map[string]any{"organization_slug": org["slug"], "tracking_code": created["tracking_code"]}
	tracked := rpc(public, "TrackComplaint", "", tracking, 200).Data["complaint"].(map[string]any)
	if tracked["first_name"] != nil {
		t.Fatal("el seguimiento filtró datos privados")
	}

	list := rpc(owner, "ListComplaints", "", nil, 200).Data
	complaint := list["rows"].([]any)[0].(map[string]any)
	if complaint["amount"] != "12.50" {
		t.Fatalf("se perdió precisión decimal: %v", complaint["amount"])
	}

	id := complaint["id"].(string)
	detail := rpc(reader, "GetComplaint", id, nil, 200).Data["complaint"].(map[string]any)
	if detail["document_number"] != "00012345" {
		t.Fatalf("el documento debe conservarse como texto: %v", detail["document_number"])
	}

	rpc(reader, "Respond", id, map[string]any{"response": "No permitido", "priority": "medium"}, 403)
	rpc(owner, "StartReview", id, nil, 200)
	rpc(owner, "SaveDraft", id, map[string]any{"draft_response": "Borrador privado"}, 200)
	rpc(owner, "UpdateClassification", id, map[string]any{"priority": "high", "category_id": category["id"]}, 200)

	// Dos respuestas concurrentes: una sola puede convertirse en oficial.
	var wg sync.WaitGroup
	codes := make(chan int, 2)

	for i := 0; i < 2; i++ {
		wg.Add(1)

		go func() {
			defer wg.Done()

			body, _ := json.Marshal(
				map[string]any{
					"id": id,
					"data": map[string]any{
						"response":    "Respuesta definitiva",
						"priority":    "high",
						"category_id": category["id"],
					},
				},
			)

			req, _ := http.NewRequest(
				http.MethodPost,
				server.URL+"/rpc/openreclamos.backend.v1.BackendService/Respond",
				bytes.NewReader(body),
			)

			req.Header.Set("Content-Type", "application/json")

			response, err := owner.Do(req)
			if err != nil {
				codes <- 0

				return
			}

			io.Copy(io.Discard, response.Body)
			response.Body.Close()
			codes <- response.StatusCode
		}()
	}

	wg.Wait()
	close(codes)

	// una respuesta debe salir bien (200) y la otra dar conflicto (400)
	success := 0
	conflicts := 0

	for code := range codes {
		if code == 200 {
			success++
		}

		if code == 400 {
			conflicts++
		}
	}

	if success != 1 || conflicts != 1 {
		t.Fatalf("respuestas concurrentes: success=%d conflicts=%d", success, conflicts)
	}

	for _, method := range []string{"GetReceipt", "GetResponsePDF"} {
		out := rpc(reader, method, id, nil, 200)
		pdf, err := base64.StdEncoding.DecodeString(out.Document)
		if err != nil || !bytes.HasPrefix(pdf, []byte("%PDF-")) {
			t.Fatalf("%s no generó PDF: %v", method, err)
		}

		// El PDF se genera una vez y luego se sirve el mismo archivo guardado.
		if again := rpc(owner, method, id, nil, 200); again.Document != out.Document {
			t.Fatalf("%s regeneró el documento en lugar de servir el guardado", method)
		}
	}

	// los dos pdf quedan guardados en disco
	stored, err := filepath.Glob(filepath.Join(storageDir, "documents", "*", id, "*.pdf"))
	if err != nil || len(stored) != 2 {
		t.Fatalf("documentos guardados: %v %v", stored, err)
	}

	xlsx := rpc(owner, "ExportBook", "", map[string]any{"format": "xlsx"}, 200)
	b, _ := base64.StdEncoding.DecodeString(xlsx.Document)
	if !bytes.HasPrefix(b, []byte("PK")) {
		t.Fatal("XLSX inválido")
	}

	rpc(owner, "GetDashboard", "", nil, 200)
	rpc(owner, "ListAudit", "", nil, 200)
	rpc(owner, "GetNotices", "", nil, 200)
	rpc(owner, "DeleteCategory", category["id"].(string), nil, 200)

	// Otra empresa no obtiene el reclamo ni los documentos por su ID.
	rpc(
		other,
		"Register",
		"",
		map[string]any{
			"name": "Otro admin", "last_name": "Prueba",
			"email":           "other-" + suffix + "@example.com",
			"password":        password,
			"document_type":   "DNI",
			"document_number": "2" + suffix,
		},
		200,
	)

	orgInput["slug"] = "other-" + suffix
	orgInput["tax_id"] = "21" + digits(suffix)

	rpc(other, "CreateOrganization", "", orgInput, 200)
	rpc(other, "GetComplaint", id, nil, 404)
	rpc(other, "GetReceipt", id, nil, 404)

	// api key del lector para probar la api y el mcp
	apiKey := rpc(reader, "CreateAPIKey", "", map[string]any{"name": "Consulta"}, 200).Data["api_key"].(string)
	apiRequest, _ := http.NewRequest(http.MethodGet, server.URL+"/api/v1/complaints", nil)

	apiRequest.Header.Set("Authorization", "Bearer "+apiKey)

	apiResponse, err := reader.Do(apiRequest)
	if err != nil {
		t.Fatal(err)
	}

	io.Copy(io.Discard, apiResponse.Body)
	apiResponse.Body.Close()

	if apiResponse.StatusCode != 200 {
		t.Fatalf("API Huma: %d", apiResponse.StatusCode)
	}

	// El servidor MCP autentica y expone las cinco herramientas de consulta.
	mcpBody := `{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}`
	mcpRequest, _ := http.NewRequest(http.MethodPost, server.URL+"/mcp", strings.NewReader(mcpBody))

	mcpRequest.Header.Set("Authorization", "Bearer "+apiKey)
	mcpRequest.Header.Set("Content-Type", "application/json")
	mcpRequest.Header.Set("Accept", "application/json, text/event-stream")
	mcpRequest.Header.Set("Mcp-Protocol-Version", "2025-11-25")

	mcpResponse, err := reader.Do(mcpRequest)
	if err != nil {
		t.Fatal(err)
	}

	payload, _ := io.ReadAll(mcpResponse.Body)

	mcpResponse.Body.Close()

	if mcpResponse.StatusCode != 200 || !bytes.Contains(payload, []byte("list_complaints")) {
		t.Fatalf("MCP: %d %s", mcpResponse.StatusCode, payload)
	}

	// solo debe haber el job del reclamo bueno; el del rollback no
	listed, err := s.Jobs.Client.JobList(ctx, river.NewJobListParams().Kinds("deliver_webhook").First(1000))
	matched := 0

	for _, job := range listed.Jobs {
		var args jobs.WebhookArgs
		if json.Unmarshal(job.EncodedArgs, &args) == nil && args.OrganizationID == org["id"] {
			matched++
		}
	}

	if err != nil || matched != 1 {
		t.Fatalf("se esperaba un job transaccional, no el del rollback: %d %v", matched, err)
	}
}

// cambia el texto a puros números para armar un ruc
func digits(s string) string {
	var result strings.Builder

	for _, c := range s {
		result.WriteByte(byte(c)%10 + '0')
	}

	result.WriteByte('1')

	return result.String()
}
