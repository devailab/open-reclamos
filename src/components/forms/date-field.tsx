import { CalendarIcon } from 'lucide-react'
import {
	type FC,
	type ReactNode,
	useId,
	useImperativeHandle,
	useState,
} from 'react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import type { FormFieldProps } from '@/hooks/use-form'
import { cn } from '@/lib/utils'

export interface DateFieldProps extends FormFieldProps<Date | null> {
	label?: ReactNode
	placeholder?: string
	className?: string
	disabled?: boolean
	minDate?: Date
	maxDate?: Date
}

const DateField: FC<DateFieldProps> = ({
	label,
	value,
	ref,
	onValueChange,
	placeholder,
	className,
	disabled,
	minDate,
	maxDate,
	validate,
}) => {
	const [error, setError] = useState<string | null>(null)
	const [open, setOpen] = useState(false)
	const inputId = useId()

	useImperativeHandle(ref, () => ({
		focus: () => {
			// El popover no tiene método focus directo
		},
		validate: () => {
			if (!validate) return null

			const validationError = validate(value ?? null)
			setError(validationError)
			return validationError
		},
	}))

	const handleSelect = (date: Date | undefined) => {
		onValueChange?.(date || null)
		setOpen(false)

		// Validar en tiempo real si hay error
		if (error && validate) {
			const validationError = validate(date || null)
			setError(validationError)
		}
	}

	const formatDate = (date: Date | null) => {
		if (!date) return null
		return new Intl.DateTimeFormat('es-MX', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		}).format(date)
	}

	const hasError = Boolean(error)

	return (
		<div className={cn('w-full space-y-1', className)}>
			{label && (
				<Label
					htmlFor={inputId}
					className={cn(hasError && 'text-destructive')}
				>
					{label}
				</Label>
			)}

			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger
					render={
						<Button
							variant='outline'
							id={inputId}
							disabled={disabled}
							className={cn(
								'w-full justify-between font-normal',
								!value && 'text-muted-foreground',
								hasError &&
									'border-destructive ring-destructive/20',
							)}
							aria-invalid={hasError}
						>
							{value
								? formatDate(value)
								: placeholder || 'Selecciona una fecha'}
							<CalendarIcon className='size-4' />
						</Button>
					}
				/>
				<PopoverContent className='w-auto p-0' align='start'>
					<Calendar
						mode='single'
						selected={value || undefined}
						onSelect={handleSelect}
						captionLayout='dropdown'
						fromDate={minDate}
						toDate={maxDate}
						disabled={(date) => {
							if (minDate && date < minDate) return true
							if (maxDate && date > maxDate) return true
							return false
						}}
					/>
				</PopoverContent>
			</Popover>

			{error && <p className='text-sm text-destructive mt-1'>{error}</p>}
		</div>
	)
}

DateField.displayName = 'DateField'

export default DateField
