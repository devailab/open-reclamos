import type {
	ComplaintAttachment,
	ComplaintAuditEntry,
	ComplaintDetail,
} from '@/modules/complaints/detail-queries'

export interface ComplaintDetailPageProps {
	complaint: ComplaintDetail
	auditHistory: ComplaintAuditEntry[]
	attachments: ComplaintAttachment[]
}
