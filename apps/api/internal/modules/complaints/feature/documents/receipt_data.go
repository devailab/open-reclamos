package documents

import (
	"context"
	"fmt"
	"strings"
	"time"

	"openreclamos.com/api/internal/modules/complaints/entity"
	"openreclamos.com/api/internal/shared/constants"
	"openreclamos.com/api/internal/shared/database/models"
	"openreclamos.com/api/internal/shared/database/repository"
	apperrors "openreclamos.com/api/internal/shared/errors"
	"openreclamos.com/api/internal/shared/utils"
)

type receiptField struct {
	Label  string
	Value  string
	Strong bool
}

// Equivalente de buildComplaintPdfBaseData y ComplaintReceiptPdfInput del origen.
type receiptDocument struct {
	Title            string
	Subject          string
	Correlative      string
	OrganizationLine string
	Metadata         []receiptField
	Provider         []receiptField
	Consumer         []receiptField
	Item             []receiptField
	Detail           string
	Request          string
	Attachments      string
	ProviderContent  string
	Response         bool
	Footer           string
}

type receiptContext struct {
	Organization     models.Organization
	Store            models.Store
	ProviderLocation string
	StoreLocation    string
	ConsumerLocation string
	Reason           string
	Attachments      []models.ComplaintAttachment
	Response         *models.ComplaintDetail
}

func (f *Feature) complaintPDF(ctx context.Context, complaint models.Complaint, response bool) ([]byte, error) {
	organization, err := f.deps.Repo.GetOrganization(ctx, complaint.OrganizationID)
	if err != nil {
		return nil, err
	}

	store, err := f.deps.Repo.GetHistoricalStore(
		ctx,
		repository.GetStoreParams{ID: complaint.StoreID, OrganizationID: complaint.OrganizationID},
	)
	if err != nil {
		return nil, err
	}

	data := receiptContext{Organization: organization, Store: store}

	location := func(id *string) (string, error) {
		if id == nil {
			return "", nil
		}

		row, err := f.deps.Repo.GetUbigeo(ctx, *id)
		if err != nil {
			return "", err
		}

		return strings.Join([]string{row.District, row.Province, row.Department}, ", "), nil
	}

	data.ProviderLocation, err = location(&organization.UbigeoID)
	if err != nil {
		return nil, err
	}

	data.StoreLocation, err = location(store.UbigeoID)
	if err != nil {
		return nil, err
	}

	data.ConsumerLocation, err = location(complaint.UbigeoID)
	if err != nil {
		return nil, err
	}

	if complaint.ReasonID != nil {
		reason, err := f.deps.Repo.GetHistoricalReason(
			ctx,
			repository.GetReasonParams{ID: *complaint.ReasonID, OrganizationID: complaint.OrganizationID},
		)
		if err != nil {
			return nil, err
		}

		data.Reason = reason.Reason
	}

	data.Attachments, err = f.deps.Repo.ListAttachments(
		ctx,
		repository.ListAttachmentsParams{OrganizationID: complaint.OrganizationID, ID: complaint.ID},
	)
	if err != nil {
		return nil, err
	}

	if response {
		details, err := f.deps.Repo.GetComplaintDetails(
			ctx,
			repository.GetComplaintDetailsParams{OrganizationID: complaint.OrganizationID, ComplaintID: complaint.ID},
		)
		if err != nil || details.OfficialResponse == nil {
			return nil, apperrors.Conflict(constants.MsgNoResponseYet)
		}

		data.Response = &details
	}

	return renderReceiptDocument(buildReceiptDocument(complaint, data))
}

func fallback(value, defaultValue string) string {
	if strings.TrimSpace(value) == "" {
		return defaultValue
	}

	return value
}

func joinReceipt(separator string, values ...string) string {
	parts := []string{}

	for _, value := range values {
		if value = strings.TrimSpace(value); value != "" {
			parts = append(parts, value)
		}
	}

	return strings.Join(parts, separator)
}

func receiptPhone(code, phone *string) string {
	if utils.Value(phone) == "" {
		return ""
	}

	return joinReceipt(" ", utils.Value(code), utils.Value(phone))
}

func receiptDateTime(date time.Time) string {
	return date.In(utils.LimaZone).Format("02/01/2006 a las 15:04")
}

func receiptLongDate(date time.Time) string {
	months := []string{
		"enero",
		"febrero",
		"marzo",
		"abril",
		"mayo",
		"junio",
		"julio",
		"agosto",
		"septiembre",
		"octubre",
		"noviembre",
		"diciembre",
	}

	local := date.In(utils.LimaZone)

	return fmt.Sprintf("%d de %s de %d", local.Day(), months[int(local.Month())-1], local.Year())
}

func buildReceiptDocument(c models.Complaint, ctx receiptContext) receiptDocument {
	org, store := ctx.Organization, ctx.Store
	address := fallback(joinReceipt(" ", org.AddressType, org.Address), "Dirección no consignada")
	legalLine := ""

	if strings.TrimSpace(org.LegalName) != strings.TrimSpace(org.Name) {
		legalLine = org.LegalName
	}

	data := receiptDocument{
		Title: "Constancia de recepción", Subject: "Constancia de recepción de reclamo", Correlative: c.Correlative,
		OrganizationLine: joinReceipt("  ·  ", org.Name, legalLine, "RUC "+org.TaxID, address),
		Metadata: []receiptField{
			{"Fecha de registro", receiptDateTime(c.CreatedAt), true},
			{"Tipo", entity.DisplayValue("type", c.Type), true},
			{"Código de seguimiento", c.TrackingCode, true},
			{"Plazo máximo de respuesta", receiptLongDate(c.ResponseDeadline), true},
		},
		Provider: []receiptField{
			{"Razón social", org.LegalName, true},
			{"RUC", org.TaxID, true},
			{"Dirección", address, false},
			{"Ubicación", fallback(ctx.ProviderLocation, "Ubicación no consignada"), false},
			{
				"Contacto",
				fallback(
					joinReceipt(" • ", receiptPhone(org.PhoneCode, org.Phone), utils.Value(org.Website)),
					"Sin datos de contacto adicionales",
				),
				false,
			},
		},
		Detail:      fallback(utils.Value(c.Description), "El consumidor no agregó un detalle adicional."),
		Request:     fallback(utils.Value(c.Request), "El consumidor no consignó un pedido específico."),
		Attachments: "No se adjuntaron archivos.",
		ProviderContent: "Constancia generada automáticamente al momento del registro. La empresa aún no registra observaciones ni acciones adoptadas sobre este caso. La respuesta debe ser comunicada hasta el " + receiptLongDate(
			c.ResponseDeadline,
		) + ".",
		Footer: "Constancia generada automáticamente por Open Reclamos. La presentación del reclamo o queja no limita el acceso a otras vías de solución de controversias ni constituye un requisito previo para acudir al INDECOPI.",
	}

	heading := joinReceipt(" ", c.FirstName, c.LastName)
	identity := joinReceipt(" ", c.DocumentType, c.DocumentNumber)
	representative := ""

	if c.PersonType == "juridical" {
		heading = fallback(utils.Value(c.LegalName), "Persona jurídica")

		if utils.Value(c.LegalTaxID) != "" {
			identity = "RUC " + utils.Value(c.LegalTaxID)
		}

		representative = "Contacto registrado: " + joinReceipt(" ", c.FirstName, c.LastName)

		if c.DocumentType != "" && c.DocumentNumber != "" {
			representative += " (" + identityDocument(c.DocumentType, c.DocumentNumber) + ")"
		}
	} else if utils.Value(c.GuardianFirstName) != "" || utils.Value(c.GuardianLastName) != "" {
		representative = joinReceipt(" • ", joinReceipt(" ", utils.Value(c.GuardianFirstName), utils.Value(c.GuardianLastName)), joinReceipt(" ", utils.Value(c.GuardianDocumentType), utils.Value(c.GuardianDocumentNumber)))
	}

	data.Consumer = []receiptField{
		{"Nombre o razón social", fallback(heading, "No consignado"), true},
		{"Documento", fallback(identity, "Documento no consignado"), false},
	}

	if representative != "" {
		data.Consumer = append(data.Consumer, receiptField{"Representante o tutor", representative, false})
	}

	data.Consumer = append(
		data.Consumer,
		receiptField{
			"Contacto",
			fallback(joinReceipt(" • ", c.Email, receiptPhone(c.DialCode, c.Phone)), "No consignado"),
			false,
		},
		receiptField{
			"Domicilio",
			fallback(joinReceipt(" • ", utils.Value(c.Address), ctx.ConsumerLocation), "No consignado"),
			false,
		},
	)

	mode, storeDetail := "Tienda física", fallback(
		joinReceipt(
			" • ",
			joinReceipt(" ", utils.Value(store.AddressType), utils.Value(store.Address)),
			ctx.StoreLocation,
		),
		"Dirección no consignada",
	)

	if store.Type == "virtual" {
		mode = "Tienda virtual"
		storeDetail = fallback(utils.Value(store.Url), "Canal virtual sin URL pública")
	}

	item := fallback(
		joinReceipt(" • ", entity.DisplayValue("item_type", utils.Value(c.ItemType)), utils.Value(c.ItemDescription)),
		"No consignado",
	)

	if c.Type == "complaint" {
		item = "No aplica para esta queja"
	}

	amount := "No se incluyó un reclamo por monto"

	if c.Amount != nil {
		currency := map[string]string{"PEN": "Soles (S/)", "USD": "Dólares (US$)"}[utils.Value(c.Currency)]
		if currency == "" {
			currency = strings.ToUpper(utils.Value(c.Currency))
		}

		amount = joinReceipt(" ", currency, numericText(c))
	}

	proof := "No se incluyó un reclamo por monto"

	if !c.HasProofOfPayment && c.Amount != nil {
		proof = "El consumidor indicó que no cuenta con comprobante de pago"
	}

	if c.HasProofOfPayment {
		label := map[string]string{"FACTURA": "Factura", "BOLETA": "Boleta de venta", "TICKET": "Ticket", "RECIBO": "Recibo"}[utils.Value(c.ProofOfPaymentType)]
		label = fallback(label, strings.ToUpper(utils.Value(c.ProofOfPaymentType)))

		proof = fallback(
			joinReceipt(" • ", label, utils.Value(c.ProofOfPaymentNumber)),
			"Comprobante informado sin detalle adicional",
		)
	}

	incident := "No consignada"

	if c.IncidentDate != nil {
		incident = c.IncidentDate.In(utils.LimaZone).Format("02/01/2006")
	}

	data.Item = []receiptField{
		{"Tienda o canal", store.Name, true},
		{"Modalidad", mode, false},
		{"Detalle", storeDetail, false},
		{"Motivo", fallback(ctx.Reason, "No especificado"), false},
		{"Fecha del incidente", incident, false},
		{"Bien contratado", item, false},
		{"Monto reclamado", amount, false},
		{"Comprobante de pago", proof, false},
	}

	if len(ctx.Attachments) > 0 {
		data.Attachments = fmt.Sprintf("Se adjuntaron %d archivo(s).", len(ctx.Attachments))
	}

	if ctx.Response != nil {
		data.Response = true
		data.Title = "Respuesta al reclamo " + c.Correlative
		data.Subject = "Respuesta de " + org.Name + " a tu reclamo " + c.Correlative

		data.ProviderContent = "Respuesta emitida el " + receiptDateTime(
			utils.Value(ctx.Response.RespondedAt),
		) + ".\n\n" + strings.TrimSpace(
			utils.Value(ctx.Response.OfficialResponse),
		)

		data.Footer = "Respuesta generada automáticamente por Open Reclamos como parte del seguimiento del reclamo o queja registrado."
	}

	return data
}

func identityDocument(kind, number string) string { return joinReceipt(" ", kind, number) }

func numericText(c models.Complaint) string {
	if c.Amount == nil {
		return ""
	}

	return string(*c.Amount)
}
