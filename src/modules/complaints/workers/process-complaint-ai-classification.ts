import {
	getAiClassificationModelId,
	getComplaintClassificationModel,
	isAiClassificationConfigured,
} from '@/lib/ai'
import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import { inngest } from '@/lib/inngest'
import { getOrganizationComplaintSettingsForOrganization } from '@/modules/settings/queries'
import {
	applyComplaintClassificationResult,
	COMPLAINT_AI_CLASSIFICATION_EVENT,
	classifyComplaintCore,
	getComplaintClassificationContext,
} from '../ai-classification'

function getClassificationFailureMessage(error: unknown) {
	if (error instanceof Error && error.message.trim()) {
		return error.message.trim().slice(0, 1000)
	}

	return 'No se pudo clasificar el reclamo con IA.'
}

export const processComplaintAiClassification = inngest.createFunction(
	{
		id: 'complaints-process-ai-classification',
		retries: 0,
		triggers: [{ event: COMPLAINT_AI_CLASSIFICATION_EVENT }],
	},
	async ({ event, step }) => {
		const settings = await step.run('load-ai-settings', () =>
			getOrganizationComplaintSettingsForOrganization(
				event.data.organizationId,
			),
		)

		if (!settings.aiClassificationEnabled) {
			return { ok: true, skipped: 'ai-disabled' }
		}

		if (!isAiClassificationConfigured()) {
			return { ok: true, skipped: 'provider-not-configured' }
		}

		const payload = await step.run('load-classification-context', () =>
			getComplaintClassificationContext({
				complaintId: event.data.complaintId,
				organizationId: event.data.organizationId,
			}),
		)

		if (!payload) {
			return { ok: false, reason: 'complaint-not-found' }
		}

		try {
			const classification = await step.run('classify-complaint', () =>
				classifyComplaintCore(payload, {
					model: getComplaintClassificationModel(),
				}),
			)

			const appliedTags = await step.run('apply-classification', () =>
				applyComplaintClassificationResult({
					complaintId: event.data.complaintId,
					organizationId: event.data.organizationId,
					classification,
				}),
			)

			await step.run('audit-classification-success', () =>
				createAuditLog({
					organizationId: event.data.organizationId,
					action: AUDIT_LOG.COMPLAINT_AI_CLASSIFIED,
					entityType: 'complaint',
					entityId: event.data.complaintId,
					description: classification.priorityReason,
					newData: {
						model: getAiClassificationModelId(),
						priority: classification.priority,
						summary: classification.summary,
						priorityReason: classification.priorityReason,
						tags: appliedTags.map((tag) => ({
							id: tag.id,
							name: tag.name,
							color: tag.color,
						})),
					},
				}),
			)

			return {
				ok: true,
				priority: classification.priority,
				tags: appliedTags.length,
			}
		} catch (error) {
			const message = getClassificationFailureMessage(error)

			await step.run('audit-classification-failure', () =>
				createAuditLog({
					organizationId: event.data.organizationId,
					action: AUDIT_LOG.COMPLAINT_AI_CLASSIFICATION_FAILED,
					entityType: 'complaint',
					entityId: event.data.complaintId,
					description: message,
					newData: {
						model: isAiClassificationConfigured()
							? getAiClassificationModelId()
							: null,
					},
				}),
			)

			return { ok: false, error: message }
		}
	},
)
