import { redirect } from 'next/navigation'
import type { FC } from 'react'
import { getSession } from '@/lib/auth-server'
import {
	getComplaintAttachments,
	getComplaintAuditHistory,
	getComplaintDetailById,
} from '@/modules/complaints/detail-queries'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'
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

	const [complaint, auditHistory] = await Promise.all([
		getComplaintDetailById(id, membership.organizationId),
		getComplaintAuditHistory(id, membership.organizationId),
	])

	if (!complaint) redirect('/dashboard/complaints')

	// Verificar acceso a la tienda del reclamo
	if (
		membership.storeAccessMode === 'selected' &&
		!membership.storeIds.includes(complaint.storeId)
	) {
		redirect('/dashboard/complaints')
	}

	const attachments = await getComplaintAttachments(complaint.id)

	return (
		<ComplaintDetailPage
			complaint={complaint}
			auditHistory={auditHistory}
			attachments={attachments}
		/>
	)
}

export default ComplaintDetailRoute
