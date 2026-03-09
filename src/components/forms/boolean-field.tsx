import {
	type FC,
	type ReactNode,
	useId,
	useImperativeHandle,
	useRef,
} from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { FormFieldProps } from '@/hooks/use-form'
import { cn } from '@/lib/utils'

export interface BooleanFieldProps extends FormFieldProps<boolean> {
	label?: ReactNode
	description?: string
	className?: string
	disabled?: boolean
	variant?: 'normal' | 'checkbox' | 'switch-checkbox'
}

const BooleanField: FC<BooleanFieldProps> = ({
	label,
	value,
	ref,
	onValueChange,
	description,
	className,
	disabled,
	variant = 'normal',
}) => {
	const switchRef = useRef<HTMLButtonElement>(null)
	const checkboxRef = useRef<HTMLButtonElement>(null)
	const inputId = useId()

	useImperativeHandle(ref, () => ({
		focus: () => {
			if (variant === 'normal') {
				switchRef.current?.focus()
			} else {
				checkboxRef.current?.focus()
			}
		},
		validate: () => null,
	}))

	const handleChange = (checked: boolean) => {
		onValueChange?.(checked)
	}

	// Variante normal: label a la izquierda, switch a la derecha
	if (variant === 'normal') {
		return (
			<div
				className={cn(
					'flex items-center justify-between gap-4',
					className,
				)}
			>
				<div className='flex-1 space-y-0.5'>
					{label && (
						<Label htmlFor={inputId} className='cursor-pointer'>
							{label}
						</Label>
					)}
					{description && (
						<p className='text-sm text-muted-foreground'>
							{description}
						</p>
					)}
				</div>
				<Switch
					id={inputId}
					ref={switchRef}
					checked={value ?? false}
					onCheckedChange={handleChange}
					disabled={disabled}
				/>
			</div>
		)
	}

	// Variante checkbox: checkbox a la izquierda, label a la derecha
	if (variant === 'checkbox') {
		return (
			<div className={cn('flex items-center gap-2', className)}>
				<Checkbox
					id={inputId}
					ref={checkboxRef}
					checked={value ?? false}
					onCheckedChange={handleChange}
					disabled={disabled}
				/>
				<div className='flex-1 space-y-0.5'>
					{label && (
						<Label htmlFor={inputId} className='cursor-pointer'>
							{label}
						</Label>
					)}
					{description && (
						<p className='text-sm text-muted-foreground'>
							{description}
						</p>
					)}
				</div>
			</div>
		)
	}

	// Variante switch-checkbox: switch a la izquierda, label a la derecha
	return (
		<div className={cn('flex items-center gap-2', className)}>
			<Switch
				id={inputId}
				ref={switchRef}
				checked={value ?? false}
				onCheckedChange={handleChange}
				disabled={disabled}
			/>
			<div className='flex-1 space-y-0.5'>
				{label && (
					<Label htmlFor={inputId} className='cursor-pointer'>
						{label}
					</Label>
				)}
				{description && (
					<p className='text-sm text-muted-foreground'>
						{description}
					</p>
				)}
			</div>
		</div>
	)
}

BooleanField.displayName = 'BooleanField'

export default BooleanField
