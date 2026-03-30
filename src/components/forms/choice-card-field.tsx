'use client'

import { CheckIcon } from 'lucide-react'
import { useId, useImperativeHandle, useRef, useState } from 'react'
import { Label } from '@/components/ui/label'
import type { FormFieldProps } from '@/hooks/use-form'
import { cn } from '@/lib/utils'

export interface ChoiceCardOption<T extends string = string> {
	value: T
	label: string
	description?: string
}

export interface ChoiceCardFieldProps<
	TOptionValue extends string = string,
	TFieldValue extends TOptionValue | null = TOptionValue,
> extends FormFieldProps<TFieldValue> {
	options: ChoiceCardOption<TOptionValue>[]
	label?: string
	disabled?: boolean
	columns?: 1 | 2 | 3
}

function ChoiceCardField<
	TOptionValue extends string = string,
	TFieldValue extends TOptionValue | null = TOptionValue,
>({
	options,
	label,
	value,
	onValueChange,
	validate,
	ref,
	disabled,
	columns = 2,
}: ChoiceCardFieldProps<TOptionValue, TFieldValue>) {
	const [error, setError] = useState<string | null>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const inputId = useId()

	useImperativeHandle(ref, () => ({
		focus: () => {
			const first = containerRef.current?.querySelector('button')
			first?.focus()
		},
		validate: () => {
			const validationError = validate?.(value as TFieldValue) ?? null
			setError(validationError)
			return validationError
		},
	}))

	const gridClass = {
		1: 'grid-cols-1',
		2: 'grid-cols-1 sm:grid-cols-2',
		3: 'grid-cols-1 sm:grid-cols-3',
	}[columns]

	const handleSelect = (nextValue: TOptionValue) => {
		if (disabled) return

		onValueChange?.(nextValue as TFieldValue)

		if (error) {
			setError(validate?.(nextValue as TFieldValue) ?? null)
		}
	}

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
				{options.map((option) => {
					const isSelected = value === option.value

					return (
						<button
							key={option.value}
							type='button'
							role='radio'
							aria-checked={isSelected}
							disabled={disabled}
							onClick={() => handleSelect(option.value)}
							className={cn(
								'group rounded-xl border px-4 py-3 text-left transition-all',
								'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
								isSelected
									? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
									: 'border-border bg-background hover:border-primary/40 hover:bg-muted/40',
								error && !isSelected && 'border-destructive/50',
								disabled && 'cursor-not-allowed opacity-50',
							)}
						>
							<div className='flex items-start gap-3'>
								<span
									className={cn(
										'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
										isSelected
											? 'border-primary bg-primary text-primary-foreground'
											: 'border-muted-foreground/40 bg-background text-transparent group-hover:border-primary/40',
									)}
								>
									<CheckIcon className='size-3.5' />
								</span>
								<span className='min-w-0 space-y-1'>
									<span className='block text-sm font-medium text-foreground'>
										{option.label}
									</span>
									{option.description && (
										<span className='block text-xs leading-relaxed text-muted-foreground'>
											{option.description}
										</span>
									)}
								</span>
							</div>
						</button>
					)
				})}
			</div>

			{error && <p className='text-xs text-destructive'>{error}</p>}
		</div>
	)
}

ChoiceCardField.displayName = 'ChoiceCardField'

export default ChoiceCardField
