import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import type { FC } from 'react'
import { getSession } from '@/lib/auth-server'
import { WEBHOOK_EVENT } from '@/lib/webhook-events'
import { getComplaintCategoriesForOrganization } from '@/modules/categories/queries'
import {
	getComplaintAttachments,
	getComplaintAuditHistory,
	getComplaintDetailById,
	getComplaintHistory,
} from '@/modules/complaints/detail-queries'
import { startComplaintReview } from '@/modules/complaints/review-workflow'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
import { dispatchWebhookEvent } from '@/modules/webhooks/dispatch'
import { ComplaintDetailPage } from './_features/complaint-detail-page'

interface Props {
	params: Promise<{ id: string }>
}

const ComplaintDetailRoute: FC<Props> = async ({ params }) => {
	const { id } = await params

	const session = await getSession()
	if (!session) redirect('/login')

	const membership = await getMembershipContext(session.user.id)
	if (!membership) redirect('/setup')
	if (!hasPermission(membership, 'complaints.view')) redirect('/dashboard')

	let complaint = await getComplaintDetailById(id, membership.organizationId)

	if (!complaint) redirect('/dashboard/complaints')

	// Verificar acceso a la tienda del reclamo
	if (
		membership.storeAccessMode === 'selected' &&
		!membership.storeIds.includes(complaint.storeId)
	) {
		redirect('/dashboard/complaints')
	}

	if (
		complaint.status === 'open' &&
		hasPermission(membership, 'complaints.respond')
	) {
		const reqHeaders = await headers()
		const review = await startComplaintReview({
			complaintId: complaint.id,
			organizationId: membership.organizationId,
			storeId: complaint.storeId,
			userId: session.user.id,
			ipAddress:
				reqHeaders.get('x-forwarded-for') ??
				reqHeaders.get('x-real-ip'),
			userAgent: reqHeaders.get('user-agent'),
		})

		if (review.transitioned) {
			complaint = {
				...complaint,
				status: 'in_review',
				updatedAt: review.updatedAt,
			}

			after(async () => {
				try {
					await dispatchWebhookEvent({
						organizationId: membership.organizationId,
						eventKey: WEBHOOK_EVENT.COMPLAINT_STATUS_CHANGED,
						entityType: 'complaint',
						entityId: id,
						payload: {
							fromStatus: 'open',
							toStatus: 'in_review',
						},
					})
				} catch (error) {
					console.error(
						'[webhooks] No se pudo disparar complaint.status_changed:',
						error,
					)
				}
			})
		}
	}

	const [attachments, history, auditHistory, availableCategories] =
		await Promise.all([
			getComplaintAttachments(complaint.id),
			getComplaintHistory(complaint.id, membership.organizationId),
			getComplaintAuditHistory(complaint.id, membership.organizationId),
			getComplaintCategoriesForOrganization(membership.organizationId),
		])

	return (
		<ComplaintDetailPage
			complaint={complaint}
			auditHistory={auditHistory}
			history={history}
			attachments={attachments}
			availableCategories={availableCategories}
		/>
	)
}

export default ComplaintDetailRoute
