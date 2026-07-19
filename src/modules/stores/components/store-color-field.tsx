'use client'

import { Check, Palette } from 'lucide-react'
import { useId, useImperativeHandle, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import type { FormFieldProps } from '@/hooks/use-form'
import { cn } from '@/lib/utils'
import { DEFAULT_STORE_COLOR, STORE_COLOR_OPTIONS } from '../constants'

interface StoreColorFieldProps extends FormFieldProps<string> {
	label?: string
	description?: string
	disabled?: boolean
}

export function StoreColorField({
	label = 'Color de la tienda',
	description = 'Ayuda a identificar esta tienda visualmente.',
	value = DEFAULT_STORE_COLOR,
	onValueChange,
	validate,
	ref,
	disabled,
}: StoreColorFieldProps) {
	const [open, setOpen] = useState(false)
	const [draftColor, setDraftColor] = useState(value)
	const [error, setError] = useState<string | null>(null)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const inputId = useId()
	const isCustomColor = !STORE_COLOR_OPTIONS.some(
		(option) => option.value === draftColor,
	)

	useImperativeHandle(ref, () => ({
		focus: () => triggerRef.current?.focus(),
		validate: () => {
			const validationError = validate?.(value) ?? null
			setError(validationError)
			return validationError
		},
		clearError: () => setError(null),
	}))

	const handleOpenChange = (nextOpen: boolean) => {
		if (nextOpen) setDraftColor(value)
		setOpen(nextOpen)
	}

	const handleApply = () => {
		onValueChange?.(draftColor)
		setError(validate?.(draftColor) ?? null)
		setOpen(false)
	}

	return (
		<div className='space-y-1.5'>
			<Label
				htmlFor={inputId}
				className={cn(error && 'text-destructive')}
			>
				{label}
			</Label>
			<Button
				id={inputId}
				ref={triggerRef}
				type='button'
				variant='outline'
				className={cn(
					'h-10 w-full justify-start gap-3 px-3',
					error && 'border-destructive',
				)}
				disabled={disabled}
				onClick={() => handleOpenChange(true)}
			>
				<span
					className='size-5 shrink-0 rounded-full ring-1 ring-black/10 ring-offset-1'
					style={{ backgroundColor: value }}
				/>
				<span className='flex min-w-0 flex-1 items-center justify-between gap-2'>
					<span className='truncate'>Seleccionar color</span>
					<span className='font-mono text-xs text-muted-foreground'>
						{value.toUpperCase()}
					</span>
				</span>
			</Button>
			<p className='text-xs text-muted-foreground'>{description}</p>
			{error ? <p className='text-xs text-destructive'>{error}</p> : null}

			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent className='sm:max-w-md'>
					<DialogHeader>
						<DialogTitle>Elige un color</DialogTitle>
						<DialogDescription>
							Selecciona una opción de la paleta o crea un color
							personalizado.
						</DialogDescription>
					</DialogHeader>

					<div
						role='radiogroup'
						aria-label='Colores de tienda'
						className='grid grid-cols-4 gap-4 px-2 py-4'
					>
						{STORE_COLOR_OPTIONS.map((option) => {
							const isSelected = draftColor === option.value

							return (
								<button
									key={option.value}
									type='button'
									role='radio'
									aria-label={option.label}
									aria-checked={isSelected}
									className={cn(
										'relative mx-auto flex size-11 items-center justify-center rounded-full ring-offset-2 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
										isSelected && 'ring-2 ring-foreground',
									)}
									style={{ backgroundColor: option.value }}
									onClick={() => setDraftColor(option.value)}
								>
									{isSelected ? (
										<Check className='size-5 text-white drop-shadow-sm' />
									) : null}
								</button>
							)
						})}

						<label
							className={cn(
								'relative mx-auto flex size-11 cursor-pointer items-center justify-center rounded-full bg-[conic-gradient(from_90deg,#ef4444,#f59e0b,#22c55e,#06b6d4,#3b82f6,#8b5cf6,#ec4899,#ef4444)] ring-offset-2 transition-transform hover:scale-105 focus-within:ring-2 focus-within:ring-ring',
								isCustomColor && 'ring-2 ring-foreground',
							)}
						>
							<span
								className='flex size-7 items-center justify-center rounded-full border-2 border-white shadow-sm'
								style={{ backgroundColor: draftColor }}
							>
								<Palette className='size-3.5 text-white drop-shadow-sm' />
							</span>
							<input
								type='color'
								aria-label='Color personalizado'
								className='absolute inset-0 cursor-pointer opacity-0'
								value={draftColor}
								onChange={(event) =>
									setDraftColor(
										event.target.value.toUpperCase(),
									)
								}
							/>
						</label>
					</div>

					<div className='flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5'>
						<span
							className='size-8 rounded-full ring-1 ring-black/10'
							style={{ backgroundColor: draftColor }}
						/>
						<div>
							<p className='text-sm font-medium'>Vista previa</p>
							<p className='font-mono text-xs text-muted-foreground'>
								{draftColor.toUpperCase()}
							</p>
						</div>
					</div>

					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => setOpen(false)}
						>
							Cancelar
						</Button>
						<Button type='button' onClick={handleApply}>
							Aplicar color
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
