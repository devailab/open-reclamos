'use client'

import {
	Download,
	Monitor,
	Printer,
	Smartphone,
	TriangleAlertIcon,
} from 'lucide-react'
import Link from 'next/link'
import type { SelectOption } from '@/components/forms/select-field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { FormFieldProps } from '@/hooks/use-form'
import { cn } from '@/lib/utils'
import { NoticeLinkSettings } from './notice-link-settings'
import type { Orientation } from './use-notice-state'

interface NoticeControlsProps {
	orientation: Orientation
	onOrientationChange: (value: Orientation) => void
	resolvedQrUrl: string
	isCustomUrl: boolean
	selectedStore: SelectOption | null
	storeOptions: SelectOption[]
	qrUrlFieldProps: FormFieldProps<string | null>
	selectedStoreFieldProps: FormFieldProps<SelectOption | null>
	onClearSelectedStore: () => void
	onDownload: () => void
	onPrint: () => void
	isLoading: boolean
}

export function NoticeControls({
	orientation,
	onOrientationChange,
	resolvedQrUrl,
	isCustomUrl,
	selectedStore,
	storeOptions,
	qrUrlFieldProps,
	selectedStoreFieldProps,
	onClearSelectedStore,
	onDownload,
	onPrint,
	isLoading,
}: NoticeControlsProps) {
	return (
		<aside className='flex w-full flex-col gap-5 overflow-y-auto xl:pr-2'>
			<div>
				<Link
					href='/dashboard/notices/website'
					className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors'
				>
					← Sitio web
				</Link>
			</div>

			<div>
				<h1 className='text-lg font-semibold'>Aviso Imprimible</h1>
				<p className='text-sm text-muted-foreground mt-0.5'>
					Personalízalo y colócalo en un lugar visible.
				</p>
			</div>

			<hr className='border-border' />

			<div className='space-y-2'>
				<p className='text-sm font-medium'>Disposición</p>
				<div className='flex gap-2'>
					<button
						type='button'
						onClick={() => onOrientationChange('portrait')}
						className={cn(
							'flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
							orientation === 'portrait'
								? 'bg-primary text-primary-foreground border-primary'
								: 'border-border hover:bg-muted',
						)}
					>
						<Smartphone className='size-4' />
						Vertical
					</button>
					<button
						type='button'
						onClick={() => onOrientationChange('landscape')}
						className={cn(
							'flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
							orientation === 'landscape'
								? 'bg-primary text-primary-foreground border-primary'
								: 'border-border hover:bg-muted',
						)}
					>
						<Monitor className='size-4' />
						Horizontal
					</button>
				</div>
			</div>

			<NoticeLinkSettings
				isCustomUrl={isCustomUrl}
				selectedStore={selectedStore}
				storeOptions={storeOptions}
				storeFieldProps={selectedStoreFieldProps}
				urlFieldProps={qrUrlFieldProps}
				onClearSelectedStore={onClearSelectedStore}
				customUrlNotice={
					<Alert className='border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200'>
						<TriangleAlertIcon className='text-amber-500' />
						<AlertDescription className='text-amber-800 text-xs dark:text-amber-300'>
							Si usas Open Reclamos, asegúrate de que esta URL
							redirija a{' '}
							<span className='font-medium break-all'>
								{resolvedQrUrl}
							</span>
						</AlertDescription>
					</Alert>
				}
			/>

			<div className='flex gap-2'>
				<Button
					className='flex-1 bg-green-500 hover:bg-green-600 text-white border-transparent'
					onClick={onDownload}
					disabled={isLoading}
				>
					<Download className='size-4' />
					Descargar
				</Button>
				<Button
					variant='outline'
					className='flex-1'
					onClick={onPrint}
					disabled={isLoading}
				>
					<Printer className='size-4' />
					Imprimir
				</Button>
			</div>

			<hr className='border-border' />

			<div>
				<p className='text-xs font-medium'>Nota:</p>
				<p className='text-xs text-muted-foreground mt-0.5'>
					Este aviso debe ser impreso en hoja tamaño A4 como mínimo.
				</p>
			</div>
		</aside>
	)
}
