'use server'

import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/database/database'
import { complaints } from '@/database/schema'
import { createAuditLog } from '@/lib/audit'
import { getSession } from '@/lib/auth-server'
import { getPresignedDownloadUrl } from '@/lib/s3'
import { getOrganizationForUser } from '@/modules/stores/queries'
import {
	type ComplaintAuditEntry,
	type ComplaintDetail,
	getComplaintAuditHistory,
	getComplaintDetailById,
} from './detail-queries'

export interface GetComplaintDetailResult {
	complaint: ComplaintDetail
	auditHistory: ComplaintAuditEntry[]
}

export async function $getComplaintDetailAction(
	id: string,
): Promise<GetComplaintDetailResult> {
	const session = await getSession()
	if (!session) redirect('/login')

	const organizationId = await getOrganizationForUser(session.user.id)
	if (!organizationId) redirect('/setup')

	const [complaint, auditHistory] = await Promise.all([
		getComplaintDetailById(id, organizationId),
		getComplaintAuditHistory(id, organizationId),
	])

	if (!complaint) redirect('/dashboard/complaints')

	return { complaint, auditHistory }
}

export interface RespondToComplaintInput {
	id: string
	response: string
}

export interface RespondToComplaintResult {
	success: boolean
	error?: string
}

export async function $respondToComplaintAction(
	input: RespondToComplaintInput,
): Promise<RespondToComplaintResult> {
	const session = await getSession()
	if (!session) redirect('/login')

	const organizationId = await getOrganizationForUser(session.user.id)
	if (!organizationId) redirect('/setup')

	const response = input.response?.trim()
	if (!response) {
		return { success: false, error: 'La respuesta no puede estar vacía' }
	}

	// Verificar que el reclamo pertenece a la organización y aún no fue respondido
	const existing = await getComplaintDetailById(input.id, organizationId)
	if (!existing) {
		return { success: false, error: 'Reclamo no encontrado' }
	}

	if (existing.officialResponse) {
		return {
			success: false,
			error: 'Este reclamo ya tiene una respuesta registrada',
		}
	}

	const now = new Date()

	await db
		.update(complaints)
		.set({
			officialResponse: response,
			respondedAt: now,
			respondedBy: session.user.id,
			status: 'resolved',
			updatedAt: now,
			updatedBy: session.user.id,
		})
		.where(
			and(
				eq(complaints.id, input.id),
				eq(complaints.organizationId, organizationId),
			),
		)

	// Obtener cabeceras para el log de auditoría
	const reqHeaders = await headers()
	const ipAddress =
		reqHeaders.get('x-forwarded-for') ?? reqHeaders.get('x-real-ip')
	const userAgent = reqHeaders.get('user-agent')

	await createAuditLog({
		organizationId,
		userId: session.user.id,
		action: 'complaint.responded',
		entityType: 'complaint',
		entityId: input.id,
		oldData: {
			status: existing.status,
			officialResponse: null,
		},
		newData: {
			status: 'resolved',
			officialResponse: response,
			respondedAt: now.toISOString(),
		},
		ipAddress,
		userAgent,
	})

	return { success: true }
}

export async function $getAttachmentDownloadUrlAction(
	storageKey: string,
): Promise<{ url: string } | { error: string }> {
	const session = await getSession()
	if (!session) redirect('/login')

	const url = await getPresignedDownloadUrl(storageKey)
	return { url }
}
