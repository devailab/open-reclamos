'use client'

import { type FC, useId, useImperativeHandle, useRef, useState } from 'react'
import { Label } from '@/components/ui/label'
import type { FormFieldProps } from '@/hooks/use-form'
import { cn } from '@/lib/utils'

export interface RadioCard {
	value: string
	label: string
	description?: string
}

export interface RadioCardFieldProps extends FormFieldProps<string | null> {
	options: RadioCard[]
	label?: string
	disabled?: boolean
	columns?: 1 | 2 | 3
}

const RadioCardField: FC<RadioCardFieldProps> = ({
	options,
	label,
	value,
	onValueChange,
	validate,
	ref,
	disabled,
	columns = 2,
}) => {
	const [error, setError] = useState<string | null>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const inputId = useId()

	useImperativeHandle(ref, () => ({
		focus: () => {
			const first = containerRef.current?.querySelector('button')
			first?.focus()
		},
		validate: () => {
			const err = validate?.(value ?? null) ?? null
			setError(err)
			return err
		},
	}))

	const handleSelect = (v: string) => {
		if (disabled) return
		onValueChange?.(v)
		if (error) {
			setError(validate?.(v) ?? null)
		}
	}

	const gridClass = {
		1: 'grid-cols-1',
		2: 'grid-cols-1 sm:grid-cols-2',
		3: 'grid-cols-1 sm:grid-cols-3',
	}[columns]

	return (
		<div className='space-y-2'>
			{label && (
				<Label id={inputId} className={cn(error && 'text-destructive')}>
					{label}
				</Label>
			)}

			<div
				ref={containerRef}
				role='radiogroup'
				aria-labelledby={label ? inputId : undefined}
				className={cn('grid gap-3', gridClass)}
			>
				{options.map((opt) => {
					const isSelected = value === opt.value
					return (
						<button
							key={opt.value}
							type='button'
							role='radio'
							aria-checked={isSelected}
							disabled={disabled}
							onClick={() => handleSelect(opt.value)}
							className={cn(
								'flex flex-col gap-1 rounded-lg border p-4 text-left transition-all',
								'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
								isSelected
									? 'border-primary bg-primary/5 ring-1 ring-primary'
									: 'border-border hover:border-primary/40 hover:bg-muted/40',
								error && !isSelected && 'border-destructive/50',
								disabled && 'cursor-not-allowed opacity-50',
							)}
						>
							<span className='text-sm font-medium'>
								{opt.label}
							</span>
							{opt.description && (
								<span className='text-xs text-muted-foreground leading-relaxed'>
									{opt.description}
								</span>
							)}
						</button>
					)
				})}
			</div>

			{error && <p className='text-xs text-destructive'>{error}</p>}
		</div>
	)
}

RadioCardField.displayName = 'RadioCardField'

export default RadioCardField
