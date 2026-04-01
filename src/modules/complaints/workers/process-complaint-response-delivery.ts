import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import { inngest } from '@/lib/inngest'
import {
	COMPLAINT_RESPONSE_DELIVERY_EVENT,
	getComplaintDeliveryFailure,
	getComplaintDeliveryState,
	sendComplaintResponseDelivery,
	setComplaintDeliveryStatus,
} from '../delivery'

export const processComplaintResponseDelivery = inngest.createFunction(
	{
		id: 'complaints-process-response-delivery',
		retries: 0,
		triggers: [{ event: COMPLAINT_RESPONSE_DELIVERY_EVENT }],
	},
	async ({ event, step }) => {
		const state = await step.run('load-response-delivery-state', () =>
			getComplaintDeliveryState({
				complaintId: event.data.complaintId,
				organizationId: event.data.organizationId,
			}),
		)

		if (!state) {
			return { ok: false, reason: 'complaint-not-found' }
		}

		if (state.responseDeliveryStatus === 'sent') {
			return { ok: true, skipped: true }
		}

		await step.run('mark-response-delivery-processing', () =>
			setComplaintDeliveryStatus({
				complaintId: event.data.complaintId,
				organizationId: event.data.organizationId,
				workflow: 'response',
				status: 'processing',
				recordHistory: false,
			}),
		)

		try {
			await step.run('send-response-email', () =>
				sendComplaintResponseDelivery({
					complaintId: event.data.complaintId,
					organizationId: event.data.organizationId,
				}),
			)

			await step.run('mark-response-delivery-sent', () =>
				setComplaintDeliveryStatus({
					complaintId: event.data.complaintId,
					organizationId: event.data.organizationId,
					workflow: 'response',
					status: 'sent',
				}),
			)

			return { ok: true }
		} catch (error) {
			const failure = getComplaintDeliveryFailure({
				workflow: 'response',
				error,
			})

			await step.run('mark-response-delivery-failed', () =>
				setComplaintDeliveryStatus({
					complaintId: event.data.complaintId,
					organizationId: event.data.organizationId,
					workflow: 'response',
					status: 'failed',
					failureMessage: failure.technicalMessage,
				}),
			)

			await step.run('log-response-delivery-failed', () =>
				createAuditLog({
					organizationId: event.data.organizationId,
					action: AUDIT_LOG.COMPLAINT_RESPONSE_DELIVERY_FAILED,
					entityType: 'complaint',
					entityId: event.data.complaintId,
					description: failure.technicalMessage,
					newData: {
						workflow: 'response',
						status: 'failed',
						reason: failure.publicMessage,
					},
				}),
			)

			return { ok: false, error: failure.publicMessage }
		}
	},
)
