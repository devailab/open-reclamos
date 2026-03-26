import type {
	ComplaintAuditEntry,
	ComplaintDetail,
} from '@/modules/complaints/detail-queries'

export interface ComplaintDetailPageProps {
	complaint: ComplaintDetail
	auditHistory: ComplaintAuditEntry[]
}
