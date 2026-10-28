package handler

import (
	"fmt"
	"net/http"

	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/utils"
)

// DownloadAttachment entrega un adjunto si el principal ve la tienda del reclamo.
func (h *Handler) DownloadAttachment(w http.ResponseWriter, r *http.Request) {
	p, err := h.deps.Auth.Authenticate(r.Context(), r.Header)
	if err != nil {
		http.Error(w, constants.HTTPAccessExpired, http.StatusUnauthorized)

		return
	}

	p, err = h.deps.Auth.Tenant(r.Context(), p, p.OrganizationID)
	id := r.PathValue("id")
	if err != nil || !utils.ValidID(id) {
		http.Error(w, constants.HTTPUnauthorized, http.StatusForbidden)

		return
	}

	a, err := h.deps.Repo.GetAttachment(
		r.Context(),
		repository.GetAttachmentParams{ID: id, OrganizationID: p.OrganizationID},
	)
	if err != nil || !p.CanStore(a.StoreID) {
		http.NotFound(w, r)

		return
	}

	data, err := h.deps.Storage.Get(r.Context(), a.StorageKey)
	if err != nil {
		http.NotFound(w, r)

		return
	}

	w.Header().Set("Content-Type", utils.Value(a.ContentType))
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", "adjunto"))
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "private, no-store")
	w.Write(data)
}
