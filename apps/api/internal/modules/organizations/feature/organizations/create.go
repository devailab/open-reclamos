package organizations

import (
	"context"

	"openreclamos.com/api/internal/modules/catalogs/feature/stores"
	"openreclamos.com/api/internal/shared/audit"
	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

// Create registra una empresa (con tienda inicial opcional) y la deja activa en la sesión.
func (f *Feature) Create(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	if p.AuthMethod != constants.AuthLocal {
		return operation.Output{}, apperrors.Denied()
	}

	if err := f.canCreate(ctx, p); err != nil {
		return operation.Output{}, err
	}

	d := in.Data

	if err := validate(d); err != nil {
		return operation.Output{}, err
	}

	slug, tax := utils.Text(d, "slug"), utils.Text(d, "tax_id")
	if !utils.SlugPattern.MatchString(slug) || len(slug) > 100 || !utils.TaxIDPattern.MatchString(tax) {
		return operation.Output{}, apperrors.Invalid(constants.MsgInvalidSlugOrTaxID)
	}

	initialStore, hasInitialStore := d["initial_store"].(map[string]any)
	if hasInitialStore {
		if err := stores.Validate(initialStore); err != nil {
			return operation.Output{}, err
		}
	}

	var out models.Organization

	err := f.deps.Transaction(ctx, func(q *repository.Repository) error {
		used, err := q.OrganizationSlugExists(ctx, slug)
		if err != nil {
			return err
		}
		if used {
			return apperrors.Conflict(constants.MsgSlugTaken)
		}

		out, err = q.CreateOrganization(
			ctx,
			repository.CreateOrganizationParams{
				ID:          utils.NewID(),
				UbigeoID:    utils.Text(d, "ubigeo_id"),
				Slug:        slug,
				Name:        utils.Text(d, "name"),
				LegalName:   utils.Text(d, "legal_name"),
				TaxID:       tax,
				AddressType: utils.Text(d, "address_type"),
				Address:     utils.Text(d, "address"),
				PhoneCode:   utils.Text(d, "phone_code"),
				Phone:       utils.Text(d, "phone"),
				Website:     utils.Text(d, "website"),
				CreatedBy:   &p.UserID,
			},
		)
		if err != nil {
			return err
		}

		p.OrganizationID = out.ID

		if err = q.CreateMember(ctx, repository.CreateMemberParams{UserID: p.UserID, OrganizationID: out.ID, Role: constants.RoleAdmin, StoreAccessMode: constants.StoreAccessAll, CreatedBy: &p.UserID}); err != nil {
			return err
		}

		if err = q.CreateSettings(ctx, repository.CreateSettingsParams{ID: utils.NewID(), OrganizationID: out.ID, CreatedBy: &p.UserID}); err != nil {
			return err
		}

		if err = q.CreateAuthSettings(ctx, out.ID); err != nil {
			return err
		}

		if hasInitialStore {
			if err = createInitialStore(ctx, q, p, initialStore); err != nil {
				return err
			}
		}

		return audit.Record(
			ctx,
			q,
			p,
			constants.AuditOrganizationCreated,
			constants.EntityOrganization,
			out.ID,
			nil,
			map[string]string{"name": out.Name},
		)
	})
	if err != nil {
		return operation.Output{}, err
	}

	return operation.Session(f.deps.Auth, f.deps.Auth.ContextClaims(p), out)
}

// canCreate exige registro público, admin de plataforma o ser admin activo de otra empresa.
func (f *Feature) canCreate(ctx context.Context, p auth.Principal) error {
	if f.deps.Config.AllowPublicRegistration || p.IsPlatform {
		return nil
	}

	organizations, err := f.deps.Repo.ListOrganizations(ctx, p.UserID)
	if err != nil {
		return err
	}

	for _, o := range organizations {
		if o.Role == constants.RoleAdmin && o.Status == constants.StatusActive {
			return nil
		}
	}

	return apperrors.Denied()
}

func createInitialStore(ctx context.Context, q *repository.Repository, p auth.Principal, d map[string]any) error {
	slug := utils.Text(d, "slug")
	if slug == "" {
		var err error
		slug, err = utils.UniqueSlug(ctx, utils.Text(d, "name"), q.StoreSlugExists)
		if err != nil {
			return err
		}
	}
	if !utils.SlugPattern.MatchString(slug) || len(slug) > 120 {
		return apperrors.Invalid(constants.MsgInvalidSlug)
	}

	used, err := q.StoreSlugExists(ctx, slug)
	if err != nil {
		return err
	}
	if used {
		return apperrors.Conflict(constants.MsgSlugTaken)
	}

	store, err := q.CreateStore(ctx, repository.CreateStoreParams{
		ID: utils.NewID(), OrganizationID: p.OrganizationID, Slug: slug,
		Name: utils.Text(d, "name"), Type: utils.Text(d, "type"), Color: utils.Text(d, "color"),
		UbigeoID: utils.Text(d, "ubigeo_id"), AddressType: utils.Text(d, "address_type"),
		Address: utils.Text(d, "address"), Url: utils.Text(d, "url"), CreatedBy: &p.UserID,
	})
	if err != nil {
		return err
	}

	return audit.Record(
		ctx,
		q,
		p,
		constants.AuditStoreCreated,
		constants.EntityStore,
		store.ID,
		nil,
		map[string]string{"name": store.Name},
	)
}
