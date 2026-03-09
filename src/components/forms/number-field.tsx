import {
	type FC,
	type ReactNode,
	useId,
	useImperativeHandle,
	useRef,
	useState,
} from 'react'

import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import type { FormFieldProps } from '@/hooks/use-form'
import { cn } from '@/lib/utils'

export interface NumberFieldProps extends FormFieldProps<number | null> {
	label?: ReactNode
	placeholder?: string
	prefix?: ReactNode
	suffix?: ReactNode
	prepend?: ReactNode
	append?: ReactNode
	className?: string
	min?: number
	max?: number
	allowDecimals?: boolean
	allowNegative?: boolean
	disabled?: boolean
}

const NumberField: FC<NumberFieldProps> = ({
	label,
	value,
	ref,
	onValueChange,
	placeholder,
	prefix,
	suffix,
	prepend,
	append,
	className,
	min,
	max,
	allowDecimals = true,
	allowNegative = true,
	validate,
	disabled,
}) => {
	const inputRef = useRef<HTMLInputElement>(null)
	const [error, setError] = useState<string | null>(null)
	const [displayValue, setDisplayValue] = useState<string>(
		value?.toString() || '',
	)
	const inputId = useId()

	useImperativeHandle(ref, () => ({
		focus: () => inputRef.current?.focus(),
		validate: () => {
			if (!validate) return null

			const validationError = validate(value ?? null)
			setError(validationError)
			return validationError
		},
	}))

	const parseNumber = (str: string): number | null => {
		if (str === '' || str === '-' || str === '.') return null

		const parsed = allowDecimals ? parseFloat(str) : parseInt(str, 10)
		return Number.isNaN(parsed) ? null : parsed
	}

	const isValidInput = (input: string): boolean => {
		if (input === '') return true
		if (input === '-') return allowNegative
		if (input === '.') return allowDecimals

		// Permitir números con punto decimal al inicio
		if (input === '-.') return allowNegative && allowDecimals

		// Regex para validar formato numérico
		const decimalRegex = allowDecimals ? /^-?\d*\.?\d*$/ : /^-?\d*$/

		if (!decimalRegex.test(input)) return false

		// Validar signo negativo
		if (!allowNegative && input.startsWith('-')) return false

		return true
	}

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value

		if (!isValidInput(newValue)) return

		setDisplayValue(newValue)
		const numericValue = parseNumber(newValue)

		// Validación de rango
		if (numericValue !== null) {
			if (min !== undefined && numericValue < min) {
				setError(`Mínimo ${min}`)
			} else if (max !== undefined && numericValue > max) {
				setError(`Máximo ${max}`)
			} else {
				if (error) setError(null)
			}
		}

		onValueChange?.(numericValue)
	}

	const handleBlur = () => {
		// Limpiar valores incompletos al perder el foco
		if (
			displayValue === '-' ||
			displayValue === '.' ||
			displayValue === '-.'
		) {
			setDisplayValue('')
			onValueChange?.(null)
		} else if (
			displayValue !== '' &&
			value !== null &&
			value !== undefined
		) {
			// Formatear el número correctamente
			setDisplayValue(value.toString())
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

			<InputGroup
				className={cn(
					hasError && 'border-destructive ring-destructive/20',
				)}
				data-disabled={disabled}
			>
				{prepend && (
					<InputGroupAddon align='inline-start'>
						{prepend}
					</InputGroupAddon>
				)}

				{prefix && (
					<InputGroupAddon align='inline-start'>
						{prefix}
					</InputGroupAddon>
				)}

				<InputGroupInput
					id={inputId}
					ref={inputRef}
					value={displayValue}
					onChange={handleChange}
					onBlur={handleBlur}
					placeholder={placeholder || '0'}
					aria-invalid={hasError}
					inputMode='decimal'
					disabled={disabled}
				/>

				{suffix && (
					<InputGroupAddon align='inline-end'>
						{suffix}
					</InputGroupAddon>
				)}

				{append && (
					<InputGroupAddon align='inline-end'>
						{append}
					</InputGroupAddon>
				)}
			</InputGroup>

			{error && <p className='text-sm text-destructive mt-1'>{error}</p>}
		</div>
	)
}

NumberField.displayName = 'NumberField'

export default NumberField
