import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import {
	processComplaintReceiptDelivery,
	processComplaintResponseDelivery,
} from '@/modules/complaints/workers'

export const { GET, POST, PUT } = serve({
	client: inngest,
	functions: [
		processComplaintReceiptDelivery,
		processComplaintResponseDelivery,
	],
})
