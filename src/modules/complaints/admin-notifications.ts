import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/database/database'
import {
	organizationMemberPermissions,
	permissions,
	users,
} from '@/database/schema'
import { sendEmail } from '@/lib/email'
import { formatDateTimeDisplay } from '@/lib/formatters'
import { inngest } from '@/lib/inngest'
import { getComplaintDetailById } from './detail-queries'
import { getComplaintReceiptContext } from './queries'

const COMPLAINT_ADMIN_NOTIFICATION_PERMISSION_KEY = 'complaints.notify'

export const COMPLAINT_ADMIN_NOTIFICATION_EVENT =
	'app/complaints.admin-notification.requested'

export interface ComplaintAdminNotificationEventData {
	complaintId: string
	organizationId: string
}

function getConsumerName(params: {
	personType: string
	firstName: string
	lastName: string
	legalName: string | null
}) {
	if (params.personType === 'juridical' && params.legalName?.trim()) {
		return params.legalName.trim()
	}

	return `${params.firstName} ${params.lastName}`.trim()
}

function buildAdminNotificationDashboardUrl(complaintId: string) {
	const baseUrl = process.env.BETTER_AUTH_URL?.trim()
	if (!baseUrl) return null

	return `${baseUrl.replace(/\/$/, '')}/dashboard/complaints/${complaintId}`
}

function buildComplaintAdminNotificationText(params: {
	complaint: Awaited<ReturnType<typeof getComplaintDetailById>>
	organizationName: string
	reasonLabel: string | null
}) {
	const { complaint, organizationName, reasonLabel } = params
	if (!complaint) {
		throw new Error(
			'No se pudo preparar el correo interno porque el reclamo no existe.',
		)
	}

	const detailUrl = buildAdminNotificationDashboardUrl(complaint.id)
	const lines = [
		`Se registró un nuevo reclamo en ${organizationName}.`,
		'',
		`Código de seguimiento: ${complaint.trackingCode}`,
		`Correlativo: ${complaint.correlative}`,
		`Fecha de registro: ${formatDateTimeDisplay(complaint.createdAt)}`,
		`Tienda: ${complaint.storeName}`,
		`Tipo: ${complaint.type === 'complaint' ? 'Queja' : 'Reclamo'}`,
		`Consumidor: ${getConsumerName({
			personType: complaint.personType,
			firstName: complaint.firstName,
			lastName: complaint.lastName,
			legalName: complaint.legalName,
		})}`,
		`Documento: ${complaint.documentType} ${complaint.documentNumber}`,
		`Correo del consumidor: ${complaint.email}`,
	]

	if (complaint.phone?.trim()) {
		const phoneLabel = complaint.dialCode?.trim()
			? `${complaint.dialCode} ${complaint.phone}`
			: complaint.phone
		lines.push(`Teléfono: ${phoneLabel}`)
	}

	if (reasonLabel) {
		lines.push(`Motivo: ${reasonLabel}`)
	}

	if (complaint.itemDescription?.trim()) {
		lines.push(`Producto o servicio: ${complaint.itemDescription.trim()}`)
	}

	if (complaint.description?.trim()) {
		lines.push('', 'Detalle del reclamo:', complaint.description.trim())
	}

	if (complaint.request?.trim()) {
		lines.push('', 'Pedido del consumidor:', complaint.request.trim())
	}

	if (detailUrl) {
		lines.push('', `Ver en el panel: ${detailUrl}`)
	}

	return lines.join('\n')
}

async function getComplaintAdminNotificationRecipients(organizationId: string) {
	return db
		.select({
			email: users.email,
			name: users.name,
		})
		.from(organizationMemberPermissions)
		.innerJoin(
			permissions,
			eq(organizationMemberPermissions.permissionId, permissions.id),
		)
		.innerJoin(users, eq(organizationMemberPermissions.userId, users.id))
		.where(
			and(
				eq(
					organizationMemberPermissions.organizationId,
					organizationId,
				),
				eq(
					permissions.key,
					COMPLAINT_ADMIN_NOTIFICATION_PERMISSION_KEY,
				),
				isNull(permissions.deletedAt),
			),
		)
}

export async function enqueueComplaintAdminNotification(
	data: ComplaintAdminNotificationEventData,
) {
	return inngest.send({
		name: COMPLAINT_ADMIN_NOTIFICATION_EVENT,
		data,
	})
}

export async function sendComplaintAdminNotification(
	params: ComplaintAdminNotificationEventData,
) {
	const complaint = await getComplaintDetailById(
		params.complaintId,
		params.organizationId,
	)
	if (!complaint) {
		throw new Error(
			'No se encontró el reclamo para enviar la notificación interna.',
		)
	}

	const [receiptContext, recipients] = await Promise.all([
		getComplaintReceiptContext({
			organizationId: params.organizationId,
			storeId: complaint.storeId,
			reasonId: complaint.reasonId,
			consumerUbigeoId: complaint.ubigeoId,
		}),
		getComplaintAdminNotificationRecipients(params.organizationId),
	])

	if (recipients.length === 0) {
		return { sent: 0, skipped: true }
	}

	const organizationName =
		receiptContext?.organization.name ?? 'tu organización'
	const subject = `Nuevo reclamo ${complaint.correlative}`
	const text = buildComplaintAdminNotificationText({
		complaint,
		organizationName,
		reasonLabel: receiptContext?.reasonLabel ?? complaint.reasonLabel,
	})

	await Promise.all(
		recipients.map((recipient) =>
			sendEmail({
				to: recipient.email,
				subject,
				text,
			}),
		),
	)

	return { sent: recipients.length, skipped: false }
}
