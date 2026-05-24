import { redirect } from 'next/navigation'
import { PdfPreviewWrapper } from './_features/pdf-preview-wrapper'

export const dynamic = 'force-dynamic'

export default function DevPdfPreviewPage() {
	if (process.env.NODE_ENV !== 'development') {
		redirect('/')
	}

	return <PdfPreviewWrapper />
}
