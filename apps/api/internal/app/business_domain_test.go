package app

import (
	"context"
	"net/http"
	"sync"
	"testing"
	"time"

	"connectrpc.com/connect"
	"gorm.io/gorm"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

func TestBusinessDomainReservations(t *testing.T) {
	forEachDatabase(t, func(t *testing.T, db *gorm.DB) {
		ctx := context.Background()
		s, first, firstHeader := ssoTestService(t, db)
		_, second, secondHeader := ssoTestService(t, db)

		update := func(id string, header http.Header, domain any) error {
			organization, err := s.Repo.GetOrganization(ctx, id)
			if err != nil {
				return err
			}

			_, err = s.Call(ctx, constants.OpUpdateOrganization, operation.Input{Data: map[string]any{
				"name": organization.Name, "legal_name": organization.LegalName,
				"ubigeo_id": organization.UbigeoID, "address_type": organization.AddressType,
				"address": organization.Address, "business_domain": domain,
			}}, header)

			return err
		}

		if err := update(first.OrganizationID, firstHeader, "  DeVaiLab.COM  "); err != nil {
			t.Fatal(err)
		}

		organization, err := s.Repo.GetOrganization(ctx, first.OrganizationID)
		if err != nil || utils.Value(organization.BusinessDomain) != "devailab.com" {
			t.Fatal("el dominio no quedó normalizado", err)
		}

		if err = update(first.OrganizationID, firstHeader, "devailab.com"); err != nil {
			t.Fatal("guardar el dominio propio debe funcionar", err)
		}

		if err = update(second.OrganizationID, secondHeader, "DEVAILAB.COM"); connect.CodeOf(err) != connect.CodeFailedPrecondition {
			t.Fatal("otra empresa pudo reservar el mismo dominio", err)
		}

		if err = update(first.OrganizationID, firstHeader, nil); err != nil {
			t.Fatal("el dominio debe ser opcional", err)
		}

		var wait sync.WaitGroup
		results := make(chan error, 2)

		for _, actor := range []struct {
			id     string
			header http.Header
		}{
			{first.OrganizationID, firstHeader}, {second.OrganizationID, secondHeader},
		} {
			wait.Add(1)

			go func() {
				defer wait.Done()
				results <- update(actor.id, actor.header, "devailab")
			}()
		}

		wait.Wait()
		close(results)
		success, conflicts := 0, 0

		for err = range results {
			if err == nil {
				success++
			} else if connect.CodeOf(err) == connect.CodeFailedPrecondition {
				conflicts++
			} else {
				t.Fatal(err)
			}
		}

		if success != 1 || conflicts != 1 {
			t.Fatalf("reservas simultáneas: éxitos=%d conflictos=%d", success, conflicts)
		}

		owner, err := s.Repo.GetOrganizationByBusinessDomain(ctx, "devailab")
		if err != nil {
			t.Fatal(err)
		}

		if err = db.Model(&models.Organization{}).Where("id = ?", owner.ID).Update("deleted_at", time.Now().UTC()).Error; err != nil {
			t.Fatal(err)
		}

		otherID, otherHeader := first.OrganizationID, firstHeader
		if owner.ID == otherID {
			otherID, otherHeader = second.OrganizationID, secondHeader
		}

		if err = update(otherID, otherHeader, "devailab"); err != nil {
			t.Fatal("el dominio de una empresa eliminada debe poder reutilizarse", err)
		}
	})
}

func TestBusinessDomainSSODiscovery(t *testing.T) {
	forEachDatabase(t, func(t *testing.T, db *gorm.DB) {
		ctx := context.Background()
		s, p, _ := ssoTestService(t, db)
		if err := db.Model(&models.Organization{}).Where("id = ?", p.OrganizationID).Update("business_domain", "devailab.com").Error; err != nil {
			t.Fatal(err)
		}

		lookup := func(domain string) (operation.Output, error) {
			return s.Call(ctx, constants.OpGetLoginOptions, operation.Input{Data: map[string]any{"business_domain": domain}}, nil)
		}

		if _, err := lookup("devailab.com"); connect.CodeOf(err) != connect.CodeInvalidArgument {
			t.Fatal("el modo local no debe ofrecer un acceso SSO", err)
		}

		id := utils.NewID()
		if err := s.Repo.InsertSSOConnection(ctx, repository.InsertSSOConnectionParams{
			ID: id, OrganizationID: p.OrganizationID, Protocol: "oidc", Name: "SSO empresarial", CreatedBy: &p.UserID,
		}); err != nil {
			t.Fatal(err)
		}

		if _, err := s.Repo.SetSSOPolicy(ctx, repository.SetSSOPolicyParams{
			OrganizationID: p.OrganizationID, LoginMode: "mixed", ConnectionID: id,
		}); err != nil {
			t.Fatal(err)
		}

		out, err := lookup("  DEVAILAB.COM  ")
		if err != nil || utils.PublicData(out.Data)["sso"] == nil {
			t.Fatal("el dominio no resolvió su conexión SSO", err)
		}

		for _, domain := range []string{"", "desconocido", "https://devailab.com"} {
			if _, err = lookup(domain); connect.CodeOf(err) != connect.CodeInvalidArgument {
				t.Fatal("se aceptó una búsqueda no válida", domain, err)
			}
		}

		if err = db.Model(&models.Organization{}).Where("id = ?", p.OrganizationID).Update("status", "suspended").Error; err != nil {
			t.Fatal(err)
		}

		if _, err = lookup("devailab.com"); connect.CodeOf(err) != connect.CodeInvalidArgument {
			t.Fatal("una empresa suspendida no debe aparecer en el acceso SSO", err)
		}
	})
}
