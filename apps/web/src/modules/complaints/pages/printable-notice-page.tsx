import { useEffect, useMemo, useRef, useState } from 'react'
import { saveDocument } from '@/shared/api/rpc'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Spinner } from '@/shared/components/ui/spinner'
import { NoticeControls } from '../features/notices/notice-controls'
import { printNoticeDocument } from '../features/notices/print-document'
import type { NoticeContext } from '../features/notices/types'
import { useNoticeState } from '../features/notices/use-notice-state'
import { useNotices } from '../features/notices/use-notices'
import { usePrintableDocument } from '../features/notices/use-printable-document'

function PrintableNoticeView({ defaultQrUrl, stores }: NoticeContext) {
	const state = useNoticeState(defaultQrUrl, stores)
	const storeId = state.selectedStore?.value

	const input = useMemo(
		() => ({ orientation: state.orientation, qrUrl: state.qrUrl, storeId }),
		[state.orientation, state.qrUrl, storeId],
	)

	const preview = usePrintableDocument(input)
	const [documentError, setDocumentError] = useState<string | null>(null)
	const [isBusy, setIsBusy] = useState(false)

	const [manualPDF, setManualPDF] = useState<{
		key: string | null
		url: string
	} | null>(null)

	const busy = useRef(false)
	const mounted = useRef(false)
	const printCleanup = useRef<(() => void) | null>(null)

	useEffect(() => {
		mounted.current = true

		return () => {
			mounted.current = false
			printCleanup.current?.()
		}
	}, [])

	useEffect(
		() => () => {
			if (manualPDF) {
				URL.revokeObjectURL(manualPDF.url)
			}
		},
		[manualPDF],
	)

	async function createDocument(print: boolean) {
		if (busy.current || preview.error) {
			return
		}

		busy.current = true
		setIsBusy(true)
		setDocumentError(null)

		let popup: Window | null = null

		try {
			if (print) {
				popup = window.open('', '_blank')

				if (!popup) {
					setDocumentError(
						'Permite las ventanas emergentes o abre el PDF manualmente para imprimirlo.',
					)

					return
				}

				popup.opener = null
			}

			const response = await preview.getDocument()

			if (!mounted.current) {
				popup?.close()

				return
			}

			if (!print) {
				saveDocument(response)

				return
			}

			const documentUrl = URL.createObjectURL(
				new Blob([new Uint8Array(response.document)], {
					type: 'application/pdf',
				}),
			)

			setManualPDF({ key: preview.key, url: documentUrl })

			if (!popup || popup.closed) {
				setDocumentError(
					'La ventana se cerró. Abre el PDF manualmente para imprimirlo.',
				)

				return
			}

			printCleanup.current?.()

			printCleanup.current = printNoticeDocument(
				popup,
				documentUrl,
				(message) => {
					if (mounted.current) {
						setDocumentError(message)
					}
				},
			)
		} catch (cause) {
			popup?.close()

			if (
				mounted.current &&
				!(cause instanceof Error && cause.name === 'AbortError')
			) {
				setDocumentError(
					cause instanceof Error
						? cause.message
						: 'No se pudo generar el PDF del aviso.',
				)
			}
		} finally {
			busy.current = false

			if (mounted.current) {
				setIsBusy(false)
			}
		}
	}

	const manualUrl =
		manualPDF?.key === preview.key ? manualPDF?.url : preview.document?.url

	return (
		<div className='grid flex-1 min-h-0 gap-6 xl:grid-cols-[288px_minmax(0,1fr)]'>
			<div className='space-y-5'>
				<NoticeControls
					orientation={state.orientation}
					onOrientationChange={state.setOrientation}
					resolvedQrUrl={state.resolvedQrUrl}
					isCustomUrl={state.isCustomUrl}
					selectedStore={state.selectedStore}
					storeOptions={state.storeOptions}
					qrUrlFieldProps={state.qrUrlFieldProps}
					selectedStoreFieldProps={state.selectedStoreFieldProps}
					onClearSelectedStore={state.clearSelectedStore}
					onDownload={() => void createDocument(false)}
					onPrint={() => void createDocument(true)}
					isLoading={isBusy || Boolean(preview.error)}
				/>
				{documentError ? (
					<Alert role='alert'>
						<AlertDescription>{documentError}</AlertDescription>
					</Alert>
				) : null}
				{manualUrl ? (
					<a
						href={manualUrl}
						target='_blank'
						rel='noopener noreferrer'
						className='inline-flex text-sm underline'
					>
						Abrir PDF manualmente
					</a>
				) : null}
			</div>
			<div className='min-h-130 overflow-auto rounded-xl bg-muted'>
				{preview.document ? (
					<iframe
						title='Vista previa del PDF generado en Go'
						src={preview.document.url}
						className='h-full min-h-130 w-full border-0'
					/>
				) : (
					<div className='space-y-4 p-6'>
						{preview.error ? (
							<Alert role='alert'>
								<AlertDescription>
									{preview.error}
								</AlertDescription>
								<Button
									variant='outline'
									onClick={preview.retry}
								>
									Reintentar vista previa
								</Button>
							</Alert>
						) : (
							<div className='flex items-center gap-2 text-sm'>
								<Spinner className='size-4' />
								Generando vista previa PDF...
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}

export function PrintableNoticePage() {
	const { context, fallback } = useNotices()

	return context ? <PrintableNoticeView {...context} /> : fallback
}
