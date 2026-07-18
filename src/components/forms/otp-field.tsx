import {
	type ReactNode,
	useId,
	useImperativeHandle,
	useRef,
	useState,
} from 'react'
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import type { FormFieldProps } from '@/hooks/use-form'
import { cn } from '@/lib/utils'

interface OtpFieldProps extends FormFieldProps<string | null> {
	label?: ReactNode
	length?: number
	disabled?: boolean
	className?: string
}

const OtpField = ({
	label,
	value,
	ref,
	onValueChange,
	validate,
	length = 6,
	disabled,
	className,
}: OtpFieldProps) => {
	const inputRef = useRef<HTMLInputElement>(null)
	const [error, setError] = useState<string | null>(null)
	const labelId = useId()

	useImperativeHandle(ref, () => ({
		focus: () => inputRef.current?.focus(),
		validate: () => {
			if (!validate) return null
			const err = validate(value ?? null)
			setError(err)
			return err
		},
		clearError: () => setError(null),
	}))

	const handleChange = (newValue: string) => {
		const output = newValue || null
		onValueChange?.(output)
		if (error && validate) {
			setError(validate(output))
		}
	}

	return (
		<div className={cn('w-full space-y-1', className)}>
			{label && (
				<Label id={labelId} className={cn(error && 'text-destructive')}>
					{label}
				</Label>
			)}
			<InputOTP
				ref={inputRef}
				maxLength={length}
				value={value ?? ''}
				onChange={handleChange}
				disabled={disabled}
				aria-labelledby={labelId}
				aria-invalid={Boolean(error)}
				containerClassName='w-full'
			>
				<InputOTPGroup className='w-full'>
					{Array.from({ length }).map((_, i) => (
						<InputOTPSlot key={i} index={i} className='flex-1' />
					))}
				</InputOTPGroup>
			</InputOTP>
			{error && <p className='text-sm text-destructive mt-1'>{error}</p>}
		</div>
	)
}

OtpField.displayName = 'OtpField'
export default OtpField
