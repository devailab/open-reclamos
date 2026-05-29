import { renderToBuffer } from '@react-pdf/renderer'
import { format as formatDate } from 'date-fns'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getSession } from '@/lib/auth-server'
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
import { getComplaintReceiptContext } from '@/modules/complaints/queries'
import {
	buildComplaintReceiptPdfInput,
	buildComplaintResponsePdfInput,
} from '@/modules/complaints/receipt'
import { ExportBookPdfDocument } from '@/modules/exports/components/export-book-pdf-document'
import {
	getComplaintsForExport,
	getOrganizationForExport,
} from '@/modules/exports/queries'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'

type ExportFormat = 'pdf' | 'csv' | 'xlsx'

const VALID_FORMATS: ExportFormat[] = ['pdf', 'csv', 'xlsx']

function isValidFormat(value: string): value is ExportFormat {
	return VALID_FORMATS.includes(value as ExportFormat)
}

function getOptionLabel(
	options: Array<{ value: string; label: string }>,
	value: string | null,
): string {
	if (!value) return ''
	return options.find((o) => o.value === value)?.label ?? value
}

function getStatusLabel(status: string): string {
	const labels: Record<string, string> = {
		open: 'Abierto',
		in_review: 'En revisión',
		in_progress: 'En proceso',
		resolved: 'Resuelto',
		closed: 'Cerrado',
		rejected: 'Rechazado',
	}
	return labels[status] ?? status
}

function getPersonTypeLabel(personType: string): string {
	return personType === 'juridical' ? 'Persona jurídica' : 'Persona natural'
}

function formatPhone(dialCode: string | null, phone: string | null): string {
	if (!phone) return ''
	return [dialCode, phone].filter(Boolean).join(' ')
}

function formatConsumerName(row: {
	personType: string
	firstName: string
	lastName: string
	legalName: string | null
}): string {
	if (row.personType === 'juridical' && row.legalName) {
		return row.legalName
	}
	return [row.firstName, row.lastName].filter(Boolean).join(' ')
}

interface ExportRow {
	Correlativo: string
	'Código de seguimiento': string
	'Fecha de registro': string
	Tipo: string
	Estado: string
	Tienda: string
	'Tipo de persona': string
	'Nombre / Razón social': string
	'Tipo de documento': string
	'N° de documento': string
	Email: string
	Teléfono: string
	Dirección: string
	'Tipo de bien': string
	'Descripción del bien': string
	Monto: string
	Moneda: string
	'Tiene comprobante': string
	'Tipo de comprobante': string
	'N° de comprobante': string
	'Fecha del incidente': string
	Motivo: string
	'Descripción del reclamo': string
	'Pedido del consumidor': string
	'Fecha límite de respuesta': string
	'Respuesta oficial': string
	'Fecha de respuesta': string
}

function buildExportRows(
	complaints: Awaited<ReturnType<typeof getComplaintsForExport>>,
): ExportRow[] {
	return complaints.map((row) => ({
		Correlativo: row.correlative,
		'Código de seguimiento': row.trackingCode,
		'Fecha de registro': formatDateTimeDisplay(row.createdAt),
		Tipo: getOptionLabel(COMPLAINT_TYPE_OPTIONS, row.type),
		Estado: getStatusLabel(row.status),
		Tienda: row.storeName,
		'Tipo de persona': getPersonTypeLabel(row.personType),
		'Nombre / Razón social': formatConsumerName(row),
		'Tipo de documento': row.documentType,
		'N° de documento': row.documentNumber,
		Email: row.email,
		Teléfono: formatPhone(row.dialCode, row.phone),
		Dirección: row.address ?? '',
		'Tipo de bien': getOptionLabel(ITEM_TYPE_OPTIONS, row.itemType),
		'Descripción del bien': row.itemDescription ?? '',
		Monto: row.amount ?? '',
		Moneda: getOptionLabel(CURRENCY_OPTIONS, row.currency),
		'Tiene comprobante': row.hasProofOfPayment ? 'Sí' : 'No',
		'Tipo de comprobante': getOptionLabel(
			PROOF_TYPE_OPTIONS,
			row.proofOfPaymentType,
		),
		'N° de comprobante': row.proofOfPaymentNumber ?? '',
		'Fecha del incidente': row.incidentDate
			? formatDateDisplay(row.incidentDate)
			: '',
		Motivo: row.reasonLabel ?? '',
		'Descripción del reclamo': row.description ?? '',
		'Pedido del consumidor': row.request ?? '',
		'Fecha límite de respuesta': row.responseDeadline
			? formatDateLong(row.responseDeadline)
			: '',
		'Respuesta oficial': row.officialResponse ?? '',
		'Fecha de respuesta': row.respondedAt
			? formatDateTimeDisplay(row.respondedAt)
			: '',
	}))
}

function buildCsv(rows: ExportRow[]): string {
	const first = rows[0]
	if (!first) return '﻿'
	const headers = Object.keys(first)
	const escapeCsv = (value: string) => {
		const str = String(value)
		if (str.includes(';') || str.includes('"') || str.includes('\n')) {
			return `"${str.replaceAll('"', '""')}"`
		}
		return str
	}

	const lines = [
		headers.map(escapeCsv).join(';'),
		...rows.map((row) =>
			headers
				.map((h) =>
					escapeCsv(
						(row as unknown as Record<string, string>)[h] ?? '',
					),
				)
				.join(';'),
		),
	]

	return `﻿${lines.join('\n')}`
}

function buildXlsx(rows: ExportRow[]): Buffer {
	const worksheet = XLSX.utils.json_to_sheet(rows)
	const workbook = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(workbook, worksheet, 'Reclamos')
	return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

function buildFilename(
	format: ExportFormat,
	storeSlug: string,
	startDate: Date,
	endDate: Date,
): string {
	const start = formatDate(startDate, 'yyyy-MM-dd')
	const end = formatDate(endDate, 'yyyy-MM-dd')
	return `libro-${storeSlug}-${start}-${end}.${format}`
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
	return buffer.buffer.slice(
		buffer.byteOffset,
		buffer.byteOffset + buffer.byteLength,
	) as ArrayBuffer
}

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ format: string }> },
) {
	const { format } = await params

	if (!isValidFormat(format)) {
		return new NextResponse('Formato no válido.', { status: 400 })
	}

	const session = await getSession()
	if (!session) {
		return new NextResponse('No autenticado.', { status: 401 })
	}

	const membership = await getMembershipContext(session.user.id)
	if (!membership) {
		return new NextResponse('Sin membresía activa.', { status: 403 })
	}

	if (!hasPermission(membership, 'exports.view')) {
		return new NextResponse('Sin permisos para exportar.', { status: 403 })
	}

	let body: { storeId?: string; startDate?: string; endDate?: string }
	try {
		body = await request.json()
	} catch {
		return new NextResponse('Cuerpo de solicitud inválido.', {
			status: 400,
		})
	}

	const { storeId, startDate: startDateStr, endDate: endDateStr } = body

	if (!storeId || !startDateStr || !endDateStr) {
		return new NextResponse(
			'Parámetros requeridos: storeId, startDate, endDate.',
			{
				status: 400,
			},
		)
	}

	const startDate = new Date(startDateStr)
	const endDate = new Date(endDateStr)

	if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
		return new NextResponse('Fechas inválidas.', { status: 400 })
	}

	const allowedStoreIds =
		membership.storeAccessMode === 'selected'
			? membership.storeIds
			: undefined

	if (allowedStoreIds !== undefined && !allowedStoreIds.includes(storeId)) {
		return new NextResponse('Sin acceso a esta tienda.', { status: 403 })
	}

	const complaints = await getComplaintsForExport({
		organizationId: membership.organizationId,
		storeId,
		startDate,
		endDate,
		allowedStoreIds,
	})

	const storeSlug = complaints[0]?.storeSlug ?? storeId
	const storeName = complaints[0]?.storeName ?? storeId
	const filename = buildFilename(format, storeSlug, startDate, endDate)

	if (format === 'csv') {
		return new NextResponse(buildCsv(buildExportRows(complaints)), {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="${filename}"`,
			},
		})
	}

	if (format === 'xlsx') {
		const xlsxBuf = buildXlsx(buildExportRows(complaints))
		return new NextResponse(toArrayBuffer(xlsxBuf), {
			headers: {
				'Content-Type':
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="${filename}"`,
			},
		})
	}

	const organization = await getOrganizationForExport(
		membership.organizationId,
	)
	if (!organization) {
		return new NextResponse('Organización no encontrada.', { status: 404 })
	}

	const receiptContexts = await Promise.all(
		complaints.map((c) =>
			getComplaintReceiptContext({
				organizationId: membership.organizationId,
				storeId: c.storeId,
				reasonId: c.reasonId,
				consumerUbigeoId: c.ubigeoId,
			}),
		),
	)

	const pdfInputs = complaints
		.map((complaint, i) => {
			const context = receiptContexts[i]
			if (!context) return null

			const base = {
				context,
				attachments: [],
				complaint: {
					correlative: complaint.correlative,
					trackingCode: complaint.trackingCode,
					createdAt: complaint.createdAt,
					responseDeadline:
						complaint.responseDeadline ?? complaint.createdAt,
					personType: complaint.personType,
					documentType: complaint.documentType,
					documentNumber: complaint.documentNumber,
					firstName: complaint.firstName,
					lastName: complaint.lastName,
					legalName: complaint.legalName,
					guardianFirstName: complaint.guardianFirstName,
					guardianLastName: complaint.guardianLastName,
					guardianDocumentType: complaint.guardianDocumentType,
					guardianDocumentNumber: complaint.guardianDocumentNumber,
					email: complaint.email,
					dialCode: complaint.dialCode,
					phone: complaint.phone,
					address: complaint.address,
					type: complaint.type,
					itemType: complaint.itemType,
					itemDescription: complaint.itemDescription,
					currency: complaint.currency,
					amount: complaint.amount,
					hasProofOfPayment: complaint.hasProofOfPayment ?? false,
					proofOfPaymentType: complaint.proofOfPaymentType,
					proofOfPaymentNumber: complaint.proofOfPaymentNumber,
					incidentDate: complaint.incidentDate,
					description: complaint.description,
					request: complaint.request,
				},
			}

			if (complaint.officialResponse && complaint.respondedAt) {
				return buildComplaintResponsePdfInput({
					...base,
					complaint: {
						...base.complaint,
						officialResponse: complaint.officialResponse,
						respondedAt: complaint.respondedAt,
					},
				})
			}

			return buildComplaintReceiptPdfInput(base)
		})
		.filter((input) => input !== null)

	const now = new Date()
	const buffer = await renderToBuffer(
		<ExportBookPdfDocument
			data={{
				organization: {
					name: organization.name,
					legalName: organization.legalName,
					taxId: organization.taxId,
					primaryColor: organization.primaryColor,
				},
				storeName,
				periodStart: formatDateDisplay(startDate),
				periodEnd: formatDateDisplay(endDate),
				generatedAt: formatDateTimeDisplay(now),
				complaints: pdfInputs,
			}}
		/>,
	)

	return new NextResponse(toArrayBuffer(buffer), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${filename}"`,
		},
	})
}
