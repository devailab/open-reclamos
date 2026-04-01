'use server'

import { format } from 'date-fns'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { type DbTransaction, db } from '@/database/database'
import { organizationSettings, organizations } from '@/database/schema'
import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import { getSession } from '@/lib/auth-server'
import {
	getConfiguredEmailTransport,
	sendEmail,
	verifyEmailTransport,
} from '@/lib/email'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
import { renderTestEmailPdfBuffer } from './components/test-email-pdf'
import { getOrganizationSettingsForUser } from './queries'
import {
	normalizeSendTestEmailInput,
	normalizeUpdateOrganizationInput,
	type SendTestEmailInput,
	type UpdateOrganizationInput,
	validateSendTestEmailInput,
	validateUpdateOrganizationInput,
} from './validation'

export type SettingsActionResult = { error: string } | { success: true }
export type SettingsEmailTestActionResult =
	| { error: string }
	| { success: true; messageId: string; recipientEmail: string }

type CompleteUpdateOrganizationInput = ReturnType<
	typeof normalizeUpdateOrganizationInput
> & {
	name: string
	legalName: string
	ubigeoId: string
	addressType: string
	address: string
	responseDeadlineDays: number
}

function hasRequiredOrganizationFields(
	input: ReturnType<typeof normalizeUpdateOrganizationInput>,
): input is CompleteUpdateOrganizationInput {
	return Boolean(
		input.name &&
			input.legalName &&
			input.ubigeoId &&
			input.addressType &&
			input.address &&
			input.responseDeadlineDays !== null,
	)
}

async function createOrganizationFormAvailabilityAuditLog(
	params: {
		organizationId: string
		userId: string
		previousValue: boolean
		nextValue: boolean
	},
	tx: DbTransaction,
) {
	if (params.previousValue === params.nextValue) return

	await createAuditLog(
		{
			organizationId: params.organizationId,
			userId: params.userId,
			action: params.nextValue
				? AUDIT_LOG.ORGANIZATION_FORM_ENABLED
				: AUDIT_LOG.ORGANIZATION_FORM_DISABLED,
			entityType: 'organization_form',
			entityId: params.organizationId,
			oldData: { formEnabled: params.previousValue },
			newData: { formEnabled: params.nextValue },
		},
		tx,
	)
}

function getEmailTestErrorMessage(error: unknown) {
	if (!(error instanceof Error)) {
		return 'No se pudo enviar el correo de prueba. Inténtalo nuevamente.'
	}

	const message = error.message.toLowerCase()

	if (
		message.includes('email_transport') ||
		message.includes('email_smtp_') ||
		message.includes('email_from_')
	) {
		return `Configuración de correo incompleta: ${error.message}.`
	}

	if (
		message.includes('auth') ||
		message.includes('invalid login') ||
		message.includes('invalid credentials')
	) {
		return 'No se pudo autenticar con el servidor SMTP. Revisa el usuario y la contraseña configurados.'
	}

	if (
		message.includes('enotfound') ||
		message.includes('econnrefused') ||
		message.includes('etimedout')
	) {
		return 'No fue posible conectar con el servidor SMTP. Revisa el host, puerto y la conectividad.'
	}

	if (
		message.includes('certificate') ||
		message.includes('tls') ||
		message.includes('ssl')
	) {
		return 'No se pudo establecer una conexión segura con el servidor SMTP. Revisa la configuración TLS.'
	}

	return 'No se pudo enviar el correo de prueba. Revisa la configuración SMTP e inténtalo nuevamente.'
}

export async function $updateOrganizationSettingsAction(
	input: UpdateOrganizationInput,
): Promise<SettingsActionResult> {
	const session = await getSession()
	if (!session) redirect('/login')

	const org = await getOrganizationSettingsForUser(session.user.id)
	if (!org) return { error: 'No se encontró una organización asociada.' }

	const membership = await getMembershipContext(session.user.id)
	if (!membership || membership.organizationId !== org.id) {
		return { error: 'No se encontró una membresía válida.' }
	}

	if (!hasPermission(membership, 'settings.manage')) {
		return { error: 'No tienes permisos para editar la organización.' }
	}

	const normalizedInput = normalizeUpdateOrganizationInput(input)
	const validationError = validateUpdateOrganizationInput(normalizedInput)
	if (validationError) return { error: validationError }
	if (!hasRequiredOrganizationFields(normalizedInput)) {
		return {
			error: 'No se pudo actualizar la organización. Inténtalo nuevamente.',
		}
	}

	try {
		await db.transaction(async (tx) => {
			const now = new Date()

			await tx
				.update(organizations)
				.set({
					name: normalizedInput.name,
					legalName: normalizedInput.legalName,
					ubigeoId: normalizedInput.ubigeoId,
					addressType: normalizedInput.addressType,
					address: normalizedInput.address,
					phoneCode: normalizedInput.phoneCode,
					phone: normalizedInput.phone,
					website: normalizedInput.website,
					updatedAt: now,
					updatedBy: session.user.id,
				})
				.where(eq(organizations.id, org.id))

			await tx
				.insert(organizationSettings)
				.values({
					organizationId: org.id,
					formEnabled: normalizedInput.formEnabled,
					aiClassificationEnabled:
						normalizedInput.aiClassificationEnabled,
					responseDeadlineDays: normalizedInput.responseDeadlineDays,
					createdBy: session.user.id,
					updatedAt: now,
					updatedBy: session.user.id,
				})
				.onConflictDoUpdate({
					target: organizationSettings.organizationId,
					set: {
						formEnabled: normalizedInput.formEnabled,
						aiClassificationEnabled:
							normalizedInput.aiClassificationEnabled,
						responseDeadlineDays:
							normalizedInput.responseDeadlineDays,
						updatedAt: now,
						updatedBy: session.user.id,
					},
				})

			await createAuditLog(
				{
					organizationId: org.id,
					userId: session.user.id,
					action: AUDIT_LOG.ORGANIZATION_UPDATED,
					entityType: 'organization',
					entityId: org.id,
					oldData: {
						name: org.name,
						legalName: org.legalName,
						ubigeoId: org.ubigeoId,
						addressType: org.addressType,
						address: org.address,
						phoneCode: org.phoneCode,
						phone: org.phone,
						website: org.website,
						formEnabled: org.formEnabled,
						aiClassificationEnabled: org.aiClassificationEnabled,
						responseDeadlineDays: org.responseDeadlineDays,
					},
					newData: {
						name: normalizedInput.name,
						legalName: normalizedInput.legalName,
						ubigeoId: normalizedInput.ubigeoId,
						addressType: normalizedInput.addressType,
						address: normalizedInput.address,
						phoneCode: normalizedInput.phoneCode,
						phone: normalizedInput.phone,
						website: normalizedInput.website,
						formEnabled: normalizedInput.formEnabled,
						aiClassificationEnabled:
							normalizedInput.aiClassificationEnabled,
						responseDeadlineDays:
							normalizedInput.responseDeadlineDays,
					},
				},
				tx,
			)

			await createOrganizationFormAvailabilityAuditLog(
				{
					organizationId: org.id,
					userId: session.user.id,
					previousValue: org.formEnabled,
					nextValue: normalizedInput.formEnabled,
				},
				tx,
			)
		})
	} catch {
		return {
			error: 'No se pudo actualizar la organización. Inténtalo nuevamente.',
		}
	}

	revalidatePath('/dashboard/settings')
	revalidatePath('/dashboard/stores')
	revalidatePath('/c/[slug]', 'page')
	revalidatePath('/s/[slug]', 'page')
	return { success: true }
}

export async function $sendOrganizationTestEmailAction(
	input: SendTestEmailInput,
): Promise<SettingsEmailTestActionResult> {
	const session = await getSession()
	if (!session) redirect('/login')

	const org = await getOrganizationSettingsForUser(session.user.id)
	if (!org) return { error: 'No se encontró una organización asociada.' }

	const membership = await getMembershipContext(session.user.id)
	if (!membership || membership.organizationId !== org.id) {
		return { error: 'No se encontró una membresía válida.' }
	}

	if (!hasPermission(membership, 'settings.manage')) {
		return {
			error: 'No tienes permisos para ejecutar esta prueba.',
		}
	}

	const normalizedInput = normalizeSendTestEmailInput(input)
	const validationError = validateSendTestEmailInput(normalizedInput)
	if (validationError) return { error: validationError }

	const recipientEmail = normalizedInput.recipientEmail
	if (!recipientEmail) {
		return { error: 'Debes indicar un correo de destino.' }
	}

	try {
		await verifyEmailTransport()

		const generatedAt = format(new Date(), 'dd/MM/yyyy HH:mm')
		const pdfBuffer = await renderTestEmailPdfBuffer({
			organizationName: org.name,
			recipientEmail,
			generatedAt,
		})

		const info = await sendEmail({
			to: recipientEmail,
			subject: `Prueba de correo y PDF - ${org.name}`,
			text: [
				'Hola,',
				'',
				`Este es un correo de prueba enviado desde Open Reclamos para la organización ${org.name}.`,
				'Adjuntamos un PDF de prueba generado con @react-pdf/renderer.',
				'',
				`Fecha de generación: ${generatedAt}`,
				`Correo de destino: ${recipientEmail}`,
				'',
				'Si recibiste este mensaje, la configuración SMTP está operativa.',
			].join('\n'),
			html: `
				<p>Hola,</p>
				<p>Este es un correo de prueba enviado desde <strong>Open Reclamos</strong> para la organización <strong>${org.name}</strong>.</p>
				<p>Adjuntamos un PDF de prueba generado con <code>@react-pdf/renderer</code>.</p>
				<p><strong>Fecha de generación:</strong> ${generatedAt}<br /><strong>Correo de destino:</strong> ${recipientEmail}</p>
				<p>Si recibiste este mensaje, la configuración SMTP está operativa.</p>
			`,
			attachments: [
				{
					filename: 'prueba-open-reclamos.pdf',
					content: pdfBuffer,
					contentType: 'application/pdf',
				},
			],
		})

		await createAuditLog({
			organizationId: org.id,
			userId: session.user.id,
			action: AUDIT_LOG.ORGANIZATION_TEST_EMAIL_SENT,
			entityType: 'organization_email_test',
			entityId: org.id,
			newData: {
				recipientEmail,
				messageId: info.messageId,
				transport: getConfiguredEmailTransport(),
				fileName: 'prueba-open-reclamos.pdf',
			},
		})

		return {
			success: true,
			messageId: info.messageId,
			recipientEmail,
		}
	} catch (error) {
		console.error(
			'[settings] Error al enviar correo de prueba con PDF:',
			error,
		)
		return { error: getEmailTestErrorMessage(error) }
	}
}
