'use client'

import dynamic from 'next/dynamic'
import { Spinner } from '@/components/ui/spinner'

const PdfPreviewClient = dynamic(
	() =>
		import('./pdf-preview-client').then((m) => ({
			default: m.PdfPreviewClient,
		})),
	{
		ssr: false,
		loading: () => (
			<div className='flex flex-1 items-center justify-center'>
				<Spinner className='size-6' />
			</div>
		),
	},
)

export function PdfPreviewWrapper() {
	return <PdfPreviewClient />
}
