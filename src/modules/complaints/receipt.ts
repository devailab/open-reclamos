import {
	COMPLAINT_TYPE_OPTIONS,
	CURRENCY_OPTIONS,
	ITEM_TYPE_OPTIONS,
	PROOF_TYPE_OPTIONS,
} from '@/lib/constants'
import {
	formatDateDisplay,
	formatDateLong,
	formatDateTimeDisplay,
} from '@/lib/formatters'
import type { ComplaintReceiptPdfInput } from './components/complaint-receipt-pdf'
import type { ComplaintReceiptContext } from './queries'

interface ComplaintReceiptAttachment {
	fileName: string
	contentType: string | null
}

interface ComplaintReceiptPayload {
	context: ComplaintReceiptContext
	attachments: ComplaintReceiptAttachment[]
	complaint: {
		correlative: string
		trackingCode: string
		createdAt: Date
		responseDeadline: Date
		personType: string
		documentType: string
		documentNumber: string
		firstName: string
		lastName: string
		legalName: string | null
		guardianFirstName: string | null
		guardianLastName: string | null
		guardianDocumentType: string | null
		guardianDocumentNumber: string | null
		email: string
		dialCode: string | null
		phone: string | null
		address: string | null
		type: string
		itemType: string | null
		itemDescription: string | null
		currency: string | null
		amount: string | null
		hasProofOfPayment: boolean
		proofOfPaymentType: string | null
		proofOfPaymentNumber: string | null
		incidentDate: Date | null
		description: string | null
		request: string | null
	}
}

interface BuildComplaintReceiptParams extends ComplaintReceiptPayload {}

interface BuildComplaintResponseParams extends ComplaintReceiptPayload {
	complaint: ComplaintReceiptPayload['complaint'] & {
		officialResponse: string
		respondedAt: Date
	}
}

function getOptionLabel(
	options: Array<{ value: string; label: string }>,
	value: string | null,
) {
	if (!value) return null

	return (
		options.find((option) => option.value === value)?.label ??
		value.toUpperCase()
	)
}

function getComplaintTypeMeta(type: string) {
	const option =
		COMPLAINT_TYPE_OPTIONS.find((item) => item.value === type) ?? null

	return {
		label: option?.label ?? type,
		description:
			option?.description ?? 'Solicitud registrada en el libro virtual.',
	}
}

function formatAddress(params: {
	addressType: string | null
	address: string | null
	locationLabel: string | null
}) {
	const line1 = [params.addressType, params.address]
		.filter(Boolean)
		.join(' ')
		.trim()

	return [line1, params.locationLabel].filter(Boolean).join(' • ')
}

function formatPhone(dialCode: string | null, phone: string | null) {
	if (!phone) return null
	return [dialCode, phone].filter(Boolean).join(' ')
}

function formatOrganizationContact(context: ComplaintReceiptContext) {
	const phone = formatPhone(
		context.organization.phoneCode,
		context.organization.phone,
	)

	return (
		[phone, context.organization.website].filter(Boolean).join(' • ') ||
		'Sin datos de contacto adicionales'
	)
}

function formatStoreDetail(context: ComplaintReceiptContext) {
	if (context.store.type === 'virtual') {
		return context.store.url?.trim() || 'Canal virtual sin URL pública'
	}

	return (
		formatAddress({
			addressType: context.store.addressType,
			address: context.store.address,
			locationLabel: context.store.locationLabel,
		}) || 'Dirección no consignada'
	)
}

function formatConsumerHeading(
	params: BuildComplaintReceiptParams['complaint'],
) {
	if (params.personType === 'juridical') {
		return params.legalName?.trim() || 'Persona jurídica'
	}

	return [params.firstName, params.lastName].filter(Boolean).join(' ').trim()
}

function formatConsumerRepresentative(
	params: BuildComplaintReceiptParams['complaint'],
) {
	if (params.personType === 'juridical') {
		const contactName = [params.firstName, params.lastName]
			.filter(Boolean)
			.join(' ')
			.trim()

		return contactName
			? `Contacto registrado: ${contactName}`
			: 'Contacto no consignado'
	}

	if (!params.guardianFirstName && !params.guardianLastName) return null

	const guardianName = [params.guardianFirstName, params.guardianLastName]
		.filter(Boolean)
		.join(' ')
		.trim()
	const guardianDocument = [
		params.guardianDocumentType,
		params.guardianDocumentNumber,
	]
		.filter(Boolean)
		.join(' ')
		.trim()

	return [guardianName, guardianDocument].filter(Boolean).join(' • ')
}

function formatConsumerContact(
	params: BuildComplaintReceiptParams['complaint'],
) {
	const phone = formatPhone(params.dialCode, params.phone)
	return [params.email, phone].filter(Boolean).join(' • ')
}

function formatConsumerAddress(
	params: BuildComplaintReceiptParams['complaint'],
	context: ComplaintReceiptContext,
) {
	return (
		[params.address?.trim() || null, context.consumerLocationLabel]
			.filter(Boolean)
			.join(' • ') || 'No consignado'
	)
}

function formatItemSummary(params: BuildComplaintReceiptParams['complaint']) {
	if (params.type === 'complaint') {
		return 'No aplica para esta queja'
	}

	const itemType = getOptionLabel(ITEM_TYPE_OPTIONS, params.itemType)
	const itemDescription = params.itemDescription?.trim()

	return (
		[itemType, itemDescription].filter(Boolean).join(' • ') ||
		'No consignado'
	)
}

function formatAmount(params: BuildComplaintReceiptParams['complaint']) {
	if (!params.amount) return 'No consignado'

	const currency = getOptionLabel(CURRENCY_OPTIONS, params.currency)
	return currency ? `${currency} ${params.amount}` : params.amount
}

function formatProofOfPayment(
	params: BuildComplaintReceiptParams['complaint'],
) {
	if (!params.hasProofOfPayment) {
		return 'El consumidor indicó que no cuenta con comprobante de pago'
	}

	const proofType = getOptionLabel(
		PROOF_TYPE_OPTIONS,
		params.proofOfPaymentType,
	)

	return (
		[proofType, params.proofOfPaymentNumber].filter(Boolean).join(' • ') ||
		'Comprobante informado sin detalle adicional'
	)
}

function formatAttachments(attachments: ComplaintReceiptAttachment[]) {
	if (attachments.length === 0) {
		return 'No se adjuntaron archivos.'
	}

	return `Se adjuntaron ${attachments.length} archivo(s).`
}

function buildComplaintPdfBaseData(params: ComplaintReceiptPayload) {
	const typeMeta = getComplaintTypeMeta(params.complaint.type)

	return {
		accentColor: params.context.organization.primaryColor,
		organization: {
			name: params.context.organization.name,
			legalName: params.context.organization.legalName,
			taxId: params.context.organization.taxId,
			address:
				formatAddress({
					addressType: params.context.organization.addressType,
					address: params.context.organization.address,
					locationLabel: null,
				}) || 'Dirección no consignada',
			location:
				params.context.organization.locationLabel ||
				'Ubicación no consignada',
			contact: formatOrganizationContact(params.context),
			website: params.context.organization.website,
		},
		store: {
			name: params.context.store.name,
			detail: formatStoreDetail(params.context),
			modeLabel:
				params.context.store.type === 'virtual'
					? 'Tienda virtual'
					: 'Tienda física',
		},
		consumer: {
			heading: formatConsumerHeading(params.complaint) || 'No consignado',
			identity:
				[params.complaint.documentType, params.complaint.documentNumber]
					.filter(Boolean)
					.join(' ') || 'Documento no consignado',
			representative: formatConsumerRepresentative(params.complaint),
			contact: formatConsumerContact(params.complaint) || 'No consignado',
			address: formatConsumerAddress(params.complaint, params.context),
		},
		complaint: {
			createdAt: formatDateTimeDisplay(params.complaint.createdAt),
			responseDeadline: formatDateLong(params.complaint.responseDeadline),
			typeLabel: typeMeta.label,
			typeDescription: typeMeta.description,
			reason: params.context.reasonLabel || 'No especificado',
			correlative: params.complaint.correlative,
			trackingCode: params.complaint.trackingCode,
			incidentDate: params.complaint.incidentDate
				? formatDateDisplay(params.complaint.incidentDate)
				: 'No consignada',
			itemSummary: formatItemSummary(params.complaint),
			amount: formatAmount(params.complaint),
			proofOfPayment: formatProofOfPayment(params.complaint),
		},
		narratives: {
			detail:
				params.complaint.description?.trim() ||
				'El consumidor no agregó un detalle adicional.',
			request:
				params.complaint.request?.trim() ||
				'El consumidor no consignó un pedido específico.',
			attachments: formatAttachments(params.attachments),
		},
	}
}

export function buildComplaintReceiptPdfInput(
	params: BuildComplaintReceiptParams,
): ComplaintReceiptPdfInput {
	const baseData = buildComplaintPdfBaseData(params)

	return {
		...baseData,
		document: {
			title: 'Constancia de recepción',
			subject: 'Constancia de recepción de reclamo',
			footerNote:
				'Constancia generada automáticamente por Open Reclamos. La presentación del reclamo o queja no limita el acceso a otras vías de solución de controversias ni constituye un requisito previo para acudir al INDECOPI.',
		},
		providerSection: {
			title: 'Observaciones y acciones adaptadas por el proveedor',
			content: `Constancia generada automáticamente al momento del registro. La empresa aún no registra observaciones ni acciones adoptadas sobre este caso. La respuesta debe ser comunicada hasta el ${formatDateLong(
				params.complaint.responseDeadline,
			)}.`,
			tone: 'default',
		},
	}
}

export function buildComplaintResponsePdfInput(
	params: BuildComplaintResponseParams,
): ComplaintReceiptPdfInput {
	const baseData = buildComplaintPdfBaseData(params)

	return {
		...baseData,
		document: {
			title: `Respuesta al reclamo ${params.complaint.correlative}`,
			subject: `Respuesta de ${params.context.organization.name} a tu reclamo ${params.complaint.correlative}`,
			footerNote:
				'Respuesta generada automáticamente por Open Reclamos como parte del seguimiento del reclamo o queja registrado.',
		},
		providerSection: {
			title: 'Observaciones y acciones adaptadas por el proveedor',
			content: [
				`Respuesta emitida el ${formatDateTimeDisplay(
					params.complaint.respondedAt,
				)}.`,
				'',
				params.complaint.officialResponse.trim(),
			].join('\n'),
			tone: 'response',
		},
	}
}

export function buildComplaintReceiptEmailMessage(params: {
	pdf: ComplaintReceiptPdfInput
}) {
	const fileName = `constancia-reclamo-${params.pdf.complaint.correlative}.pdf`
	const subject = `Constancia de reclamo ${params.pdf.complaint.correlative} - ${params.pdf.organization.name}`
	const text = [
		'Hola,',
		'',
		`Tu ${params.pdf.complaint.typeLabel.toLowerCase()} fue registrado correctamente en el Libro de Reclamaciones de ${params.pdf.organization.name}.`,
		`Código de seguimiento: ${params.pdf.complaint.trackingCode}`,
		`Correlativo: ${params.pdf.complaint.correlative}`,
		`Fecha de registro: ${params.pdf.complaint.createdAt}`,
		`Fecha máxima de respuesta: ${params.pdf.complaint.responseDeadline}`,
		'',
		'Adjuntamos la constancia en PDF lista para imprimir.',
		'Guarda este correo y tu código de seguimiento para futuras consultas.',
	].join('\n')

	const html = `
		<p>Hola,</p>
		<p>Tu <strong>${params.pdf.complaint.typeLabel.toLowerCase()}</strong> fue registrado correctamente en el Libro de Reclamaciones de <strong>${params.pdf.organization.name}</strong>.</p>
		<p>
			<strong>Código de seguimiento:</strong> ${params.pdf.complaint.trackingCode}<br />
			<strong>Correlativo:</strong> ${params.pdf.complaint.correlative}<br />
			<strong>Fecha de registro:</strong> ${params.pdf.complaint.createdAt}<br />
			<strong>Fecha máxima de respuesta:</strong> ${params.pdf.complaint.responseDeadline}
		</p>
		<p>Adjuntamos la constancia en PDF lista para imprimir.</p>
		<p>Guarda este correo y tu código de seguimiento para futuras consultas.</p>
	`

	return {
		fileName,
		subject,
		text,
		html,
	}
}

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;')
}

function formatResponseHtml(response: string) {
	return escapeHtml(response).replaceAll('\n', '<br />')
}

export function buildComplaintResponseEmailMessage(params: {
	pdf: ComplaintReceiptPdfInput
	response: string
	respondedAt: Date
}) {
	const fileName = `respuesta-reclamo-${params.pdf.complaint.correlative}.pdf`
	const subject = `Respuesta a tu reclamo ${params.pdf.complaint.correlative} - ${params.pdf.organization.name}`
	const responseDate = formatDateTimeDisplay(params.respondedAt)
	const text = [
		'Hola,',
		'',
		`${params.pdf.organization.name} registró una respuesta oficial para tu ${params.pdf.complaint.typeLabel.toLowerCase()}.`,
		`Código de seguimiento: ${params.pdf.complaint.trackingCode}`,
		`Correlativo: ${params.pdf.complaint.correlative}`,
		`Fecha de respuesta: ${responseDate}`,
		'',
		'Respuesta:',
		params.response,
		'',
		'Adjuntamos el PDF de respuesta para tu constancia.',
	].join('\n')

	const html = `
		<p>Hola,</p>
		<p><strong>${params.pdf.organization.name}</strong> registró una respuesta oficial para tu <strong>${params.pdf.complaint.typeLabel.toLowerCase()}</strong>.</p>
		<p>
			<strong>Código de seguimiento:</strong> ${params.pdf.complaint.trackingCode}<br />
			<strong>Correlativo:</strong> ${params.pdf.complaint.correlative}<br />
			<strong>Fecha de respuesta:</strong> ${responseDate}
		</p>
		<p><strong>Respuesta:</strong></p>
		<p>${formatResponseHtml(params.response)}</p>
		<p>Adjuntamos el PDF de respuesta para tu constancia.</p>
	`

	return {
		fileName,
		subject,
		text,
		html,
	}
}

export function getComplaintEmailErrorMessage(
	error: unknown,
	workflow: 'submission' | 'response',
) {
	const defaultMessage =
		workflow === 'submission'
			? 'Ocurrió un error inesperado. Intenta de nuevo.'
			: 'Error al guardar la respuesta. Intenta de nuevo.'

	if (!(error instanceof Error)) {
		return defaultMessage
	}

	const message = error.message.toLowerCase()

	if (
		message.includes('email_transport') ||
		message.includes('email_smtp_') ||
		message.includes('email_from_')
	) {
		return workflow === 'submission'
			? 'No pudimos confirmar tu reclamo porque el servicio de correo no está configurado correctamente.'
			: 'No pudimos enviar la respuesta porque el servicio de correo no está configurado correctamente.'
	}

	if (
		message.includes('auth') ||
		message.includes('invalid login') ||
		message.includes('invalid credentials') ||
		message.includes('enotfound') ||
		message.includes('econnrefused') ||
		message.includes('etimedout') ||
		message.includes('certificate') ||
		message.includes('tls') ||
		message.includes('ssl')
	) {
		return workflow === 'submission'
			? 'No pudimos registrar tu reclamo porque ocurrió un problema al enviar la constancia por correo.'
			: 'No pudimos registrar la respuesta porque ocurrió un problema al enviar el correo.'
	}

	return defaultMessage
}
