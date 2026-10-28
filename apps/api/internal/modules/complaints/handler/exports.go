package handler

import (
	"fmt"
	"net/http"

	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/utils"
)

// DownloadExport entrega una exportación completada a su autor.
func (h *Handler) DownloadExport(w http.ResponseWriter, r *http.Request) {
	p, err := h.deps.Auth.Authenticate(r.Context(), r.Header)
	if err != nil {
		http.Error(w, constants.HTTPAccessExpired, http.StatusUnauthorized)

		return
	}

	p, err = h.deps.Auth.Tenant(r.Context(), p, p.OrganizationID)
	if err != nil {
		http.Error(w, constants.HTTPUnauthorized, http.StatusForbidden)

		return
	}

	export, err := h.exports.Authorized(r.Context(), p, r.PathValue("id"))
	if err != nil || export.Status != constants.ExportCompleted {
		http.NotFound(w, r)

		return
	}

	data, err := h.deps.Storage.Get(r.Context(), utils.Value(export.StorageKey))
	if err != nil {
		http.NotFound(w, r)

		return
	}

	contentType := constants.ContentTypePDF

	if export.Format == constants.FormatXLSX {
		contentType = constants.ContentTypeXLSX
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "private, no-store")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"libro.%s\"", export.Format))
	w.Write(data)
}
