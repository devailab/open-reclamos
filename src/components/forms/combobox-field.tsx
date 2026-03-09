import { Check, ChevronsUpDown } from 'lucide-react'
import {
	type FC,
	type ReactNode,
	useId,
	useImperativeHandle,
	useState,
} from 'react'

import { Button } from '@/components/ui/button'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import type { FormFieldProps } from '@/hooks/use-form'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
	value: string
	label: string
}

export interface ComboboxFieldProps
	extends FormFieldProps<ComboboxOption | null> {
	label?: ReactNode
	placeholder?: string
	searchPlaceholder?: string
	emptyMessage?: string
	options: ComboboxOption[]
	className?: string
	disabled?: boolean
}

const ComboboxField: FC<ComboboxFieldProps> = ({
	label,
	value,
	ref,
	onValueChange,
	placeholder,
	searchPlaceholder,
	emptyMessage,
	options,
	className,
	validate,
	disabled,
}) => {
	const [open, setOpen] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const inputId = useId()

	const findOptionByValue = (val: string): ComboboxOption | null => {
		return options.find((opt) => opt.value === val) ?? null
	}

	useImperativeHandle(ref, () => ({
		focus: () => {
			setOpen(true)
		},
		validate: () => {
			if (!validate) return null

			const validationError = validate(value ?? null)
			setError(validationError)
			return validationError
		},
	}))

	const handleSelect = (selectedValue: string) => {
		const isDeselecting = value?.value === selectedValue
		const selectedOption = isDeselecting
			? null
			: findOptionByValue(selectedValue)
		onValueChange?.(selectedOption)
		setOpen(false)

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

			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger
					render={
						<Button
							id={inputId}
							variant='outline'
							role='combobox'
							aria-expanded={open}
							aria-invalid={hasError}
							disabled={disabled}
							className={cn(
								'w-full justify-between font-normal',
								!value && 'text-muted-foreground',
								hasError &&
									'border-destructive ring-destructive/20',
							)}
						>
							<span
								className='truncate'
								title={
									value?.label ||
									placeholder ||
									'Selecciona una opción'
								}
							>
								{value?.label ||
									placeholder ||
									'Selecciona una opción'}
							</span>
							<ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
						</Button>
					}
				/>
				<PopoverContent className='w-[--radix-popover-trigger-width] p-0'>
					<Command>
						<CommandInput
							placeholder={searchPlaceholder || 'Buscar...'}
							className='h-9'
						/>
						<CommandList>
							<CommandEmpty>
								{emptyMessage ||
									'No se encontraron resultados.'}
							</CommandEmpty>
							<CommandGroup>
								{options.map((option) => (
									<CommandItem
										key={option.value}
										value={option.label}
										onSelect={() =>
											handleSelect(option.value)
										}
									>
										{option.label}
										<Check
											className={cn(
												'ml-auto h-4 w-4',
												value?.value === option.value
													? 'opacity-100'
													: 'opacity-0',
											)}
										/>
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>

			{error && <p className='text-sm text-destructive mt-1'>{error}</p>}
		</div>
	)
}

ComboboxField.displayName = 'ComboboxField'

export default ComboboxField
