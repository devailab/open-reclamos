'use client'

import { Store, Undo2 } from 'lucide-react'
import type { ReactNode } from 'react'
import SelectField, { type SelectOption } from '@/components/forms/select-field'
import TextField from '@/components/forms/text-field'
import { Button } from '@/components/ui/button'
import type { FormFieldProps } from '@/hooks/use-form'

interface NoticeLinkSettingsProps {
	isCustomUrl: boolean
	selectedStore: SelectOption | null
	storeOptions: SelectOption[]
	storeFieldProps: FormFieldProps<SelectOption | null>
	urlFieldProps: FormFieldProps<string | null>
	onClearSelectedStore: () => void
	customUrlNotice?: ReactNode
}

export function NoticeLinkSettings({
	isCustomUrl,
	selectedStore,
	storeOptions,
	storeFieldProps,
	urlFieldProps,
	onClearSelectedStore,
	customUrlNotice,
}: NoticeLinkSettingsProps) {
	return (
		<div className='space-y-3'>
			<div className='space-y-2'>
				<SelectField
					{...storeFieldProps}
					label='Tienda'
					placeholder='Usar organización actual'
					options={storeOptions}
					disabled={storeOptions.length === 0}
					prefix={<Store className='size-4' />}
				/>
				<div className='flex items-center justify-between gap-3'>
					<p className='text-xs text-muted-foreground'>
						{storeOptions.length === 0
							? 'No tienes tiendas activas disponibles para este aviso.'
							: selectedStore
								? 'Se está usando la URL pública de la tienda seleccionada.'
								: 'Si no seleccionas una tienda, se usará la URL pública de tu organización.'}
					</p>
					{selectedStore && (
						<Button
							type='button'
							variant='ghost'
							size='xs'
							onClick={onClearSelectedStore}
						>
							<Undo2 className='size-3' />
							Usar organización
						</Button>
					)}
				</div>
			</div>

			<div className='space-y-2'>
				<TextField
					{...urlFieldProps}
					label='URL del QR'
					placeholder='https://...'
					type='url'
				/>
				{isCustomUrl && customUrlNotice}
			</div>
		</div>
	)
}
