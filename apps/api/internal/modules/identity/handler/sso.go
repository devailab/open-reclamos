// Package handler expone las rutas HTTP (no RPC) del módulo de identidad.
package handler

import (
	"encoding/xml"
	"net/http"

	"openreclamos.com/api/internal/modules/identity/feature/sso"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/deps"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/utils"
)

type SSO struct {
	deps    *deps.Deps
	feature *sso.Feature
}

func NewSSO(d *deps.Deps, feature *sso.Feature) *SSO { return &SSO{deps: d, feature: feature} }

// Routes devuelve cada patrón HTTP con su acción SSO.
func Routes() map[string]string {
	return map[string]string{
		"GET /auth/sso/{connection}/start":         constants.SSOActionStart,
		"POST /auth/sso/{connection}/start":        constants.SSOActionStart,
		"GET /auth/sso/{connection}/oidc/callback": constants.SSOActionOIDCCallback,
		"GET /auth/sso/{connection}/saml/metadata": constants.SSOActionSAMLMetadata,
		"POST /auth/sso/{connection}/saml/acs":     constants.SSOActionSAMLACS,
	}
}

// Serve atiende inicio, callbacks y metadata SSO; la acción llega en el path value "action".
func (h *SSO) Serve(w http.ResponseWriter, r *http.Request) {
	if h.deps.DB == nil {
		http.Error(w, constants.HTTPDatabaseUnavailable, http.StatusServiceUnavailable)

		return
	}

	id := r.PathValue("connection")
	if !utils.ValidID(id) {
		http.NotFound(w, r)

		return
	}

	conn, err := h.deps.Repo.GetSSOConnection(r.Context(), id)
	if err != nil || conn.OrganizationStatus != constants.StatusActive {
		http.NotFound(w, r)

		return
	}

	action := r.PathValue("action")
	if action == constants.SSOActionSAMLMetadata {
		h.metadata(w, r, id)

		return
	}

	if action == constants.SSOActionStart {
		err = h.feature.Start(w, r, conn)
	} else {
		err = h.feature.Callback(w, r, conn, action)
	}

	if err != nil {
		http.Error(w, constants.MsgSSOFailed, errorStatus(err))
	}
}

func (h *SSO) metadata(w http.ResponseWriter, r *http.Request, id string) {
	sp, err := h.feature.ServiceProvider(r.Context(), id)
	if err != nil {
		http.Error(w, constants.MsgSSOMetadataUnavailable, http.StatusBadRequest)

		return
	}

	b, err := xml.Marshal(sp.Metadata())
	if err != nil {
		http.Error(w, constants.MsgSSOMetadataUnavailable, http.StatusInternalServerError)

		return
	}

	w.Header().Set("Content-Type", constants.ContentTypeSAMLMetadata)
	w.Write(b)
}

func errorStatus(err error) int {
	switch apperrors.Code(err) {
	case apperrors.CodeUnauthenticated:
		return http.StatusUnauthorized

	case apperrors.CodePermissionDenied:
		return http.StatusForbidden
	}

	return http.StatusBadRequest
}
