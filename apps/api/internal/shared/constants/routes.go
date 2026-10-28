package constants

// Rutas públicas usadas para construir enlaces absolutos con PUBLIC_BASE_URL.
const (
	PathInvitation       = "/invite/"
	PathOrganizationBook = "/c/"
	PathStoreBook        = "/s/"
	PathFiles            = "/api/files/"
	PathExports          = "/api/exports/"
	PathSSO              = "/auth/sso/"
	PathAuthStatus       = "/status"
)

// Sufijos de las rutas SSO bajo PathSSO + {connection}.
const (
	SSOActionStart        = "start"
	SSOActionOIDCCallback = "oidc/callback"
	SSOActionSAMLMetadata = "saml/metadata"
	SSOActionSAMLACS      = "saml/acs"
)

// SSOURL arma la URL pública de una acción SSO de una conexión.
func SSOURL(baseURL, connectionID, action string) string {
	return baseURL + PathSSO + connectionID + "/" + action
}
