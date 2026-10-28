package stores

import (
	"net/url"

	"openreclamos.com/api/internal/shared/constants"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/utils"
)

// Validate revisa los datos de una tienda; también lo usa la creación de empresas.
func Validate(d map[string]any) error {
	name, kind := utils.Text(d, "name"), utils.Text(d, "type")
	if len([]rune(name)) < 3 || !utils.Required(name, 120) || !utils.ColorPattern.MatchString(utils.Text(d, "color")) {
		return apperrors.Invalid(constants.MsgInvalidStoreNameOrColor)
	}

	if kind != constants.StorePhysical && kind != constants.StoreVirtual {
		return apperrors.Invalid(constants.MsgInvalidStoreType)
	}

	if kind == constants.StorePhysical &&
		(!utils.ValidID(utils.Text(d, "ubigeo_id")) || utils.Text(d, "address_type") == "" || utils.Text(d, "address") == "") {
		return apperrors.Invalid(constants.MsgPhysicalStoreAddress)
	}

	if raw := utils.Text(d, "url"); raw != "" {
		u, err := url.Parse(raw)
		if err != nil || u.Host == "" || (u.Scheme != "https" && u.Scheme != "http") {
			return apperrors.Invalid(constants.MsgInvalidStoreURL)
		}
	}

	return nil
}

// validateScope exige un ID válido y acceso del principal a la tienda.
func validateScope(canStore bool, id string) error {
	if !canStore {
		return apperrors.Denied()
	}

	if !utils.ValidID(id) {
		return apperrors.Invalid(constants.MsgInvalidStore)
	}

	return nil
}
