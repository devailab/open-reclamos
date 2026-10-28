package organizations

import (
	"openreclamos.com/api/internal/shared/constants"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/utils"
)

// validate revisa los datos comunes al crear o editar una empresa.
func validate(d map[string]any) error {
	for _, key := range []string{"name", "legal_name", "address", "address_type"} {
		if !utils.Required(utils.Text(d, key), 300) {
			return apperrors.Invalid(constants.MsgOrganizationDataRequired)
		}
	}

	if !utils.ValidID(utils.Text(d, "ubigeo_id")) {
		return apperrors.Invalid(constants.MsgInvalidDistrict)
	}

	return nil
}
