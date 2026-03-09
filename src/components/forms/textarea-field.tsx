import {
	type FC,
	type ReactNode,
	useId,
	useImperativeHandle,
	useRef,
	useState,
} from 'react'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { FormFieldProps } from '@/hooks/use-form'
import { cn } from '@/lib/utils'

export interface TextAreaFieldProps extends FormFieldProps<string | null> {
	label?: ReactNode
	placeholder?: string
	className?: string
	rows?: number
	disabled?: boolean
	emptyAsNull?: boolean
}

const TextAreaField: FC<TextAreaFieldProps> = ({
	label,
	value,
	ref,
	onValueChange,
	placeholder,
	className,
	rows = 4,
	validate,
	disabled,
	emptyAsNull = false,
}) => {
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const [error, setError] = useState<string | null>(null)
	const inputId = useId()

	const normalizeValue = (val: string | null | undefined): string => {
		return val ?? ''
	}

	const normalizeOutput = (val: string): string | null => {
		return emptyAsNull && val === '' ? null : val
	}

	useImperativeHandle(ref, () => ({
		focus: () => textareaRef.current?.focus(),
		validate: () => {
			if (!validate) return null

			const validationError = validate(value ?? null)
			setError(validationError)
			return validationError
		},
	}))

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

			<Textarea
				id={inputId}
				ref={textareaRef}
				value={normalizeValue(value)}
				onChange={handleChange}
				placeholder={placeholder || 'Ingresa un valor'}
				rows={rows}
				disabled={disabled}
				aria-invalid={hasError}
				className={cn(
					'w-full',
					hasError &&
						'border-destructive ring-destructive/20 focus-visible:ring-destructive/20',
				)}
			/>

			{error && <p className='text-sm text-destructive mt-1'>{error}</p>}
		</div>
	)
}

TextAreaField.displayName = 'TextAreaField'

export default TextAreaField
