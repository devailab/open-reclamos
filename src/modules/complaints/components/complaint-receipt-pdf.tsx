import { renderToBuffer } from '@react-pdf/renderer'
import {
	ComplaintReceiptPdfDocument,
	type ComplaintReceiptPdfInput,
} from './complaint-receipt-pdf-document'

export type { ComplaintReceiptPdfInput }

export async function renderComplaintReceiptPdfBuffer(
	data: ComplaintReceiptPdfInput,
) {
	return renderToBuffer(<ComplaintReceiptPdfDocument data={data} />)
}
