import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import {
	processComplaintAdminNotification,
	processComplaintAiClassification,
	processComplaintReceiptDelivery,
	processComplaintResponseDelivery,
} from '@/modules/complaints/workers'
import { deliverWebhook } from '@/modules/webhooks/workers'

export const { GET, POST, PUT } = serve({
	client: inngest,
	functions: [
		processComplaintAdminNotification,
		processComplaintAiClassification,
		processComplaintReceiptDelivery,
		processComplaintResponseDelivery,
		deliverWebhook,
	],
})
