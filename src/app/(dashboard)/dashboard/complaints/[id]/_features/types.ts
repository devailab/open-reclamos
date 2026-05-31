import type { ComplaintCategoryRow } from '@/modules/categories/queries'
import type {
	ComplaintAttachment,
	ComplaintAuditEntry,
	ComplaintDetail,
	ComplaintHistoryEntry,
} from '@/modules/complaints/detail-queries'

export interface ComplaintDetailPageProps {
	complaint: ComplaintDetail
	auditHistory: ComplaintAuditEntry[]
	history: ComplaintHistoryEntry[]
	attachments: ComplaintAttachment[]
	availableCategories: Pick<
		ComplaintCategoryRow,
		'id' | 'name' | 'description'
	>[]
}
