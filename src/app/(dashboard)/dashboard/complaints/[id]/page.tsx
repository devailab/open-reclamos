import { redirect } from 'next/navigation'
import type { FC } from 'react'
import { getSession } from '@/lib/auth-server'
import {
	getComplaintAttachments,
	getComplaintAuditHistory,
	getComplaintDetailById,
} from '@/modules/complaints/detail-queries'
import { getOrganizationForUser } from '@/modules/stores/queries'
import { ComplaintDetailPage } from './_features/complaint-detail-page'

interface Props {
	params: Promise<{ id: string }>
}

const ComplaintDetailRoute: FC<Props> = async ({ params }) => {
	const { id } = await params

	const session = await getSession()
	if (!session) redirect('/login')

	const organizationId = await getOrganizationForUser(session.user.id)
	if (!organizationId) redirect('/setup')

	const [complaint, auditHistory] = await Promise.all([
		getComplaintDetailById(id, organizationId),
		getComplaintAuditHistory(id, organizationId),
	])

	if (!complaint) redirect('/dashboard/complaints')

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
