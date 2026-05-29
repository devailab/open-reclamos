import { AUDIT_LOG, createAuditLog } from '@/lib/audit'
import { inngest } from '@/lib/inngest'
import {
	COMPLAINT_ADMIN_NOTIFICATION_EVENT,
	sendComplaintAdminNotification,
} from '../admin-notifications'

function getTechnicalErrorMessage(error: unknown) {
	if (error instanceof Error && error.message.trim()) {
		return error.message.trim()
	}

	return 'No se pudo enviar la notificación interna de reclamo.'
}

export const processComplaintAdminNotification = inngest.createFunction(
	{
		id: 'complaints-process-admin-notification',
		retries: 0,
		triggers: [{ event: COMPLAINT_ADMIN_NOTIFICATION_EVENT }],
	},
	async ({ event, step }) => {
		try {
			const result = await step.run('send-admin-notification-email', () =>
				sendComplaintAdminNotification({
					complaintId: event.data.complaintId,
					organizationId: event.data.organizationId,
				}),
			)

			return { ok: true, ...result }
		} catch (error) {
			const technicalMessage = getTechnicalErrorMessage(error)

			await step.run('log-admin-notification-failed', () =>
				createAuditLog({
					organizationId: event.data.organizationId,
					action: AUDIT_LOG.COMPLAINT_ADMIN_NOTIFICATION_FAILED,
					entityType: 'complaint',
					entityId: event.data.complaintId,
					description: technicalMessage,
					newData: {
						workflow: 'admin_notification',
						status: 'failed',
					},
				}),
			)

			return { ok: false, error: technicalMessage }
		}
	},
)
