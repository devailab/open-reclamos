import {
	type FC,
	type ReactNode,
	useId,
	useImperativeHandle,
	useState,
} from 'react'

import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import type { FormFieldProps } from '@/hooks/use-form'
import { cn } from '@/lib/utils'

export interface SelectOption {
	value: string
	label: string
}

export interface SelectFieldProps extends FormFieldProps<SelectOption | null> {
	label?: ReactNode
	placeholder?: string
	options: SelectOption[]
	className?: string
	disabled?: boolean
	prefix?: ReactNode
}

const SelectField: FC<SelectFieldProps> = ({
	label,
	value,
	ref,
	onValueChange,
	placeholder,
	options,
	className,
	validate,
	disabled,
	prefix,
}) => {
	const [error, setError] = useState<string | null>(null)
	const inputId = useId()

	const findOptionByValue = (val: string): SelectOption | null => {
		return options.find((opt) => opt.value === val) ?? null
	}

	useImperativeHandle(ref, () => ({
		focus: () => {},
		validate: () => {
			if (!validate) return null

			const validationError = validate(value ?? null)
			setError(validationError)
			return validationError
		},
	}))

	const handleValueChange = (selectedValue: string | null) => {
		const selectedOption = selectedValue
			? findOptionByValue(selectedValue)
			: null
		onValueChange?.(selectedOption)

		if (error && validate) {
			const validationError = validate(selectedOption)
			setError(validationError)
		}
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

			<div className='relative'>
				{prefix && (
					<span className='pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-muted-foreground'>
						{prefix}
					</span>
				)}
				<Select
					value={value?.value ?? ''}
					onValueChange={handleValueChange}
					disabled={disabled}
				>
					<SelectTrigger
						id={inputId}
						className={cn(
							'w-full',
							prefix && 'pl-9',
							hasError &&
								'border-destructive ring-destructive/20',
						)}
						aria-invalid={hasError}
						disabled={disabled}
					>
						<SelectValue
							className='leading-normal'
							placeholder={placeholder || 'Selecciona una opción'}
						>
							{value?.label}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{options.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{error && <p className='text-sm text-destructive mt-1'>{error}</p>}
		</div>
	)
}

SelectField.displayName = 'SelectField'

export default SelectField
