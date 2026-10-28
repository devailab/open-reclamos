// Package handler expone las rutas HTTP (no RPC) del módulo de organizaciones.
package handler

import (
	"encoding/json"
	"net/http"

	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/deps"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/storage"
	"openreclamos.com/api/internal/shared/utils"
)

type Logo struct{ deps *deps.Deps }

func NewLogo(d *deps.Deps) *Logo { return &Logo{deps: d} }

// Upload reemplaza el logo de la empresa activa (solo administradores, PNG o JPEG).
func (h *Logo) Upload(w http.ResponseWriter, r *http.Request) {
	upload, err := storage.ReadUpload(w, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)

		return
	}

	if upload.ContentType != constants.ContentTypeJPEG && upload.ContentType != constants.ContentTypePNG {
		http.Error(w, constants.HTTPLogoType, http.StatusBadRequest)

		return
	}

	p, err := h.deps.Auth.Authenticate(r.Context(), r.Header)
	if err != nil {
		http.Error(w, constants.HTTPAccessExpired, http.StatusUnauthorized)

		return
	}

	p, err = h.deps.Auth.Tenant(r.Context(), p, p.OrganizationID)
	if err != nil || p.Role != constants.RoleAdmin {
		http.Error(w, constants.HTTPUnauthorized, http.StatusForbidden)

		return
	}

	id, raw := utils.NewID(), utils.Token()
	key := storage.PrefixLogos + p.OrganizationID + "/" + id

	if err = h.deps.Storage.Put(r.Context(), key, upload.ContentType, upload.Data); err != nil {
		http.Error(w, constants.HTTPStoreFailed, http.StatusInternalServerError)

		return
	}

	err = apperrors.Changed(
		h.deps.Repo.SetLogo(
			r.Context(),
			repository.SetLogoParams{ID: p.OrganizationID, UpdatedBy: &p.UserID, LogoKey: key},
		),
	)
	if err != nil {
		_ = h.deps.Storage.Delete(r.Context(), key)

		http.Error(w, constants.HTTPRegisterFileFailed, http.StatusInternalServerError)

		return
	}

	w.Header().Set("Content-Type", constants.ContentTypeJSON)

	json.NewEncoder(w).Encode(
		map[string]any{"id": id, "token": raw, "file_name": upload.FileName, "content_type": upload.ContentType},
	)
}

// Get sirve el logo público de una empresa por su slug.
func (h *Logo) Get(w http.ResponseWriter, r *http.Request) {
	org, err := h.deps.Repo.GetPublicOrganization(r.Context(), r.PathValue("slug"))
	if err != nil || org.LogoKey == nil {
		http.NotFound(w, r)

		return
	}

	data, err := h.deps.Storage.Get(r.Context(), *org.LogoKey)
	if err != nil {
		http.NotFound(w, r)

		return
	}

	w.Header().Set("Content-Type", http.DetectContentType(data))
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Write(data)
}
