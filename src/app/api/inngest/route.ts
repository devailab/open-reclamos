import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import {
	processComplaintAiClassification,
	processComplaintReceiptDelivery,
	processComplaintResponseDelivery,
} from '@/modules/complaints/workers'

export const { GET, POST, PUT } = serve({
	client: inngest,
	functions: [
		processComplaintAiClassification,
		processComplaintReceiptDelivery,
		processComplaintResponseDelivery,
	],
})
