import type {
	ComplaintAttachment,
	ComplaintAuditEntry,
	ComplaintCategoryRow,
	ComplaintDetail,
	ComplaintHistoryEntry,
} from '../../types'

export interface ComplaintDetailPageProps {
	canRespond?: boolean
	onChanged?: () => void
	complaint: ComplaintDetail
	auditHistory: ComplaintAuditEntry[]
	history: ComplaintHistoryEntry[]
	attachments: ComplaintAttachment[]
	availableCategories: Pick<
		ComplaintCategoryRow,
		'id' | 'name' | 'description'
	>[]
}
