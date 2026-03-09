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

export interface TextFieldProps extends FormFieldProps<string | null> {
	label?: ReactNode
	placeholder?: string
	type?: string
	prefix?: ReactNode
	suffix?: ReactNode
	prepend?: ReactNode
	append?: ReactNode
	className?: string
	disabled?: boolean
	emptyAsNull?: boolean
	onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
}

const TextField: FC<TextFieldProps> = ({
	label,
	value,
	ref,
	onValueChange,
	placeholder,
	type,
	prefix,
	suffix,
	prepend,
	append,
	className,
	validate,
	disabled,
	emptyAsNull = false,
	onKeyDown,
}) => {
	const inputRef = useRef<HTMLInputElement>(null)
	const [error, setError] = useState<string | null>(null)
	const inputId = useId()

	const normalizeValue = (val: string | null | undefined): string => {
		return val ?? ''
	}

	const normalizeOutput = (val: string): string | null => {
		return emptyAsNull && val === '' ? null : val
	}

	useImperativeHandle(ref, () => ({
		focus: () => inputRef.current?.focus(),
		validate: () => {
			if (!validate) return null

			const validationError = validate(value ?? null)
			setError(validationError)
			return validationError
		},
	}))

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value
		const outputValue = normalizeOutput(newValue)
		onValueChange?.(outputValue)

		// Validar en tiempo real si hay error
		if (error && validate) {
			const validationError = validate(outputValue)
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

			<InputGroup
				className={cn(
					hasError && 'border-destructive ring-destructive/20',
				)}
				data-disabled={undefined}
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
					type={type || 'text'}
					value={normalizeValue(value)}
					onChange={handleChange}
					onKeyDown={onKeyDown}
					placeholder={placeholder || 'Ingresa un valor'}
					aria-invalid={hasError}
					disabled={disabled}
					className='leading-normal'
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

TextField.displayName = 'TextField'

export default TextField
