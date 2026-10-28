package public

import (
	"slices"
	"time"

	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/utils"
)

var (
	guardianFields = []string{
		"guardian_first_name",
		"guardian_last_name",
		"guardian_document_type",
		"guardian_document_number",
	}

	maxFieldLengths = map[string]int{
		"phone":                   20,
		"address":                 300,
		"item_description":        1000,
		"proof_of_payment_number": 50,
		"description":             5000,
		"request":                 5000,
	}

	detailEnumOptions = map[string][]string{
		"item_type":             {"product", "service"},
		"currency":              {"PEN", "USD"},
		"proof_of_payment_type": {"FACTURA", "BOLETA", "TICKET", "RECIBO"},
	}
)

func validDocument(kind, number string) bool {
	return slices.Contains(constants.DocumentTypes, kind) && len(number) >= 6 && len(number) <= 20
}

// validate revisa el formulario público del consumidor.
func validate(d map[string]any) error {
	for _, field := range []string{"is_minor", "has_proof_of_payment"} {
		if raw, exists := d[field]; exists {
			if _, ok := raw.(bool); !ok {
				return apperrors.Invalid(constants.MsgInvalidBoolean)
			}
		}
	}

	if files, exists := d["files"]; exists {
		if _, ok := files.([]any); !ok {
			return apperrors.Invalid(constants.MsgInvalidFileList)
		}
	}

	if !slices.Contains(constants.PersonTypes, utils.Text(d, "person_type")) ||
		!slices.Contains(constants.ComplaintTypes, utils.Text(d, "type")) {
		return apperrors.Invalid(constants.MsgInvalidPersonOrType)
	}

	if err := validateConsumer(d); err != nil {
		return err
	}

	for key, max := range maxFieldLengths {
		if len([]rune(utils.Text(d, key))) > max {
			return apperrors.Invalid(constants.MsgFieldTooLong)
		}
	}

	for key, options := range detailEnumOptions {
		v := utils.Text(d, key)
		if v != "" && !slices.Contains(options, v) {
			return apperrors.Invalid(constants.MsgInvalidDetailValue)
		}
	}

	return validateDetail(d)
}

// validateConsumer revisa identidad, persona jurídica y tutor.
func validateConsumer(d map[string]any) error {
	if !validDocument(utils.Text(d, "document_type"), utils.Text(d, "document_number")) ||
		!utils.Required(utils.Text(d, "first_name"), 120) ||
		!utils.Required(utils.Text(d, "last_name"), 120) ||
		!utils.ValidEmail(utils.Text(d, "email")) {
		return apperrors.Invalid(constants.MsgInvalidConsumer)
	}

	if utils.Text(d, "person_type") == constants.PersonJuridical {
		if !utils.Required(utils.Text(d, "legal_name"), 200) ||
			!utils.TaxIDPattern.MatchString(utils.Text(d, "legal_tax_id")) ||
			utils.Bool(d, "is_minor") {
			return apperrors.Invalid(constants.MsgInvalidJuridicalPerson)
		}
	} else if utils.Text(d, "legal_name") != "" || utils.Text(d, "legal_tax_id") != "" {
		return apperrors.Invalid(constants.MsgCompanyDataNotApplicable)
	}

	if utils.Bool(d, "is_minor") {
		if !utils.Required(utils.Text(d, "guardian_first_name"), 120) ||
			!utils.Required(utils.Text(d, "guardian_last_name"), 120) ||
			!validDocument(utils.Text(d, "guardian_document_type"), utils.Text(d, "guardian_document_number")) {
			return apperrors.Invalid(constants.MsgGuardianRequired)
		}

		return nil
	}

	for _, k := range guardianFields {
		if utils.Text(d, k) != "" {
			return apperrors.Invalid(constants.MsgGuardianOnlyMinors)
		}
	}

	return nil
}

// validateDetail revisa referencias, monto, teléfono, comprobante y fecha del incidente.
func validateDetail(d map[string]any) error {
	for _, key := range []string{"reason_id", "ubigeo_id"} {
		if v := utils.Text(d, key); v != "" && !utils.ValidID(v) {
			return apperrors.Invalid(constants.MsgInvalidReference)
		}
	}

	if v, ok := d["amount"]; ok && v != nil {
		amount, ok := v.(string)
		if !ok || !utils.AmountPattern.MatchString(amount) {
			return apperrors.Invalid(constants.MsgInvalidAmount)
		}
	}

	if v := utils.Text(d, "dial_code"); v != "" && !utils.DialPattern.MatchString(v) {
		return apperrors.Invalid(constants.MsgInvalidDialCode)
	}

	if !utils.Bool(d, "has_proof_of_payment") &&
		(utils.Text(d, "proof_of_payment_type") != "" || utils.Text(d, "proof_of_payment_number") != "") {
		return apperrors.Invalid(constants.MsgProofNotApplicable)
	}

	if v := utils.Text(d, "incident_date"); v != "" {
		date, err := time.Parse(time.RFC3339, v)
		if err != nil || date.After(time.Now().Add(24*time.Hour)) {
			return apperrors.Invalid(constants.MsgInvalidIncidentDate)
		}
	}

	return nil
}

// newComplaint copia los datos del consumidor ya validados por validate.
func newComplaint(d map[string]any) models.Complaint {
	c := models.Complaint{
		Status:                 constants.ComplaintOpen,
		Priority:               constants.PriorityMedium,
		FirstName:              utils.Text(d, "first_name"),
		LastName:               utils.Text(d, "last_name"),
		DocumentType:           utils.Text(d, "document_type"),
		DocumentNumber:         utils.Text(d, "document_number"),
		PersonType:             utils.Text(d, "person_type"),
		Email:                  utils.Text(d, "email"),
		Type:                   utils.Text(d, "type"),
		IsMinor:                utils.Bool(d, "is_minor"),
		HasProofOfPayment:      utils.Bool(d, "has_proof_of_payment"),
		ReasonID:               utils.Ptr(utils.Text(d, "reason_id")),
		UbigeoID:               utils.Ptr(utils.Text(d, "ubigeo_id")),
		LegalName:              utils.Ptr(utils.Text(d, "legal_name")),
		LegalTaxID:             utils.Ptr(utils.Text(d, "legal_tax_id")),
		GuardianFirstName:      utils.Ptr(utils.Text(d, "guardian_first_name")),
		GuardianLastName:       utils.Ptr(utils.Text(d, "guardian_last_name")),
		GuardianDocumentType:   utils.Ptr(utils.Text(d, "guardian_document_type")),
		GuardianDocumentNumber: utils.Ptr(utils.Text(d, "guardian_document_number")),
		DialCode:               utils.Ptr(utils.Text(d, "dial_code")),
		Phone:                  utils.Ptr(utils.Text(d, "phone")),
		Address:                utils.Ptr(utils.Text(d, "address")),
		ItemType:               utils.Ptr(utils.Text(d, "item_type")),
		ItemDescription:        utils.Ptr(utils.Text(d, "item_description")),
		Currency:               utils.Ptr(utils.Text(d, "currency")),
		ProofOfPaymentType:     utils.Ptr(utils.Text(d, "proof_of_payment_type")),
		ProofOfPaymentNumber:   utils.Ptr(utils.Text(d, "proof_of_payment_number")),
		Description:            utils.Ptr(utils.Text(d, "description")),
		Request:                utils.Ptr(utils.Text(d, "request")),
	}

	if amount := utils.Text(d, "amount"); amount != "" {
		value := models.Decimal(amount)
		c.Amount = &value
	}

	if incident, err := time.Parse(time.RFC3339, utils.Text(d, "incident_date")); err == nil {
		c.IncidentDate = &incident
	}

	return c
}
