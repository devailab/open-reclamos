'use client'

import { PDFViewer, pdf } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import { useEffect, useMemo, useState } from 'react'
import { Spinner } from '@/components/ui/spinner'
import type { NoticeStoreOption } from '@/modules/notices/queries'
import { NoticeControls } from '../../_features/notice-controls'
import { NoticeDocument } from '../../_features/notice-document'
import { useNoticeState } from '../../_features/use-notice-state'

interface PrintablePageClientProps {
	defaultQrUrl: string
	stores: NoticeStoreOption[]
}

export function PrintablePageClient({
	defaultQrUrl,
	stores,
}: PrintablePageClientProps) {
	const {
		orientation,
		setOrientation,
		debouncedQrUrl,
		resolvedQrUrl,
		isCustomUrl,
		selectedStore,
		storeOptions,
		qrUrlFieldProps,
		selectedStoreFieldProps,
		clearSelectedStore,
	} = useNoticeState(defaultQrUrl, stores)

	const [qrDataUrl, setQrDataUrl] = useState('')

	useEffect(() => {
		const target = debouncedQrUrl || defaultQrUrl
		QRCode.toDataURL(target, {
			margin: 1,
			width: 200,
			errorCorrectionLevel: 'M',
		})
			.then(setQrDataUrl)
			.catch(() => {})
	}, [debouncedQrUrl, defaultQrUrl])

	const pdfDocument = useMemo(
		() => (
			<NoticeDocument
				orientation={orientation}
				qrDataUrl={qrDataUrl}
				qrUrl={debouncedQrUrl || defaultQrUrl}
			/>
		),
		[orientation, qrDataUrl, debouncedQrUrl, defaultQrUrl],
	)

	const handleDownload = async () => {
		const blob = await pdf(pdfDocument).toBlob()
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'aviso-libro-de-reclamaciones.pdf'
		a.click()
		URL.revokeObjectURL(url)
	}

	const handlePrint = async () => {
		const blob = await pdf(pdfDocument).toBlob()
		const url = URL.createObjectURL(blob)
		window.open(url, '_blank')
	}

	return (
		<div className='grid flex-1 min-h-0 gap-6 xl:grid-cols-[288px_minmax(0,1fr)]'>
			<NoticeControls
				orientation={orientation}
				onOrientationChange={setOrientation}
				resolvedQrUrl={resolvedQrUrl}
				isCustomUrl={isCustomUrl}
				selectedStore={selectedStore}
				storeOptions={storeOptions}
				qrUrlFieldProps={qrUrlFieldProps}
				selectedStoreFieldProps={selectedStoreFieldProps}
				onClearSelectedStore={clearSelectedStore}
				onDownload={handleDownload}
				onPrint={handlePrint}
				isLoading={!qrDataUrl}
			/>

			<div className='min-h-130 overflow-hidden rounded-xl bg-muted'>
				{!qrDataUrl ? (
					<div className='flex h-full w-full items-center justify-center'>
						<Spinner className='size-6' />
					</div>
				) : (
					<PDFViewer
						width='100%'
						height='100%'
						style={{ border: 'none' }}
					>
						{pdfDocument}
					</PDFViewer>
				)}
			</div>
		</div>
	)
}
