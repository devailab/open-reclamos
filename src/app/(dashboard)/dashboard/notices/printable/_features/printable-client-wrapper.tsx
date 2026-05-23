'use client'

import dynamic from 'next/dynamic'
import { Spinner } from '@/components/ui/spinner'
import type { NoticeStoreOption } from '@/modules/notices/queries'

const PrintablePageClient = dynamic(
	() =>
		import('./printable-page-client').then((m) => ({
			default: m.PrintablePageClient,
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

interface PrintableClientWrapperProps {
	defaultQrUrl: string
	stores: NoticeStoreOption[]
}

export function PrintableClientWrapper({
	defaultQrUrl,
	stores,
}: PrintableClientWrapperProps) {
	return <PrintablePageClient defaultQrUrl={defaultQrUrl} stores={stores} />
}
