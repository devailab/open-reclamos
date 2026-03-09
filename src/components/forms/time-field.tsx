import { format as formatDate, parse } from 'date-fns'
import { Clock } from 'lucide-react'
import {
	type FC,
	type ReactNode,
	useId,
	useImperativeHandle,
	useMemo,
	useState,
} from 'react'

import { Label } from '@/components/ui/label'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { FormFieldProps } from '@/hooks/use-form'
import { cn } from '@/lib/utils'

export interface TimeFieldProps extends FormFieldProps<string | null> {
	label?: ReactNode
	placeholder?: string
	className?: string
	disabled?: boolean
	format?: '12' | '24'
}

const TimeField: FC<TimeFieldProps> = ({
	label,
	value,
	ref,
	onValueChange,
	placeholder,
	className,
	disabled,
	format = '12',
	validate,
}) => {
	const [error, setError] = useState<string | null>(null)
	const [open, setOpen] = useState(false)
	const inputId = useId()

	const hours = useMemo(() => {
		if (format === '24') {
			return Array.from({ length: 24 }, (_, i) =>
				i.toString().padStart(2, '0'),
			)
		}
		return Array.from({ length: 12 }, (_, i) =>
			(i + 1).toString().padStart(2, '0'),
		)
	}, [format])

	const minutes = useMemo(
		() =>
			Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')),
		[],
	)

	const periods = ['AM', 'PM']

	// Parsea el valor interno (HH:mm:ss) a componentes para el UI
	const parseTime = (timeStr: string | null) => {
		if (!timeStr) return { hour: '', minute: '', period: '' }

		try {
			const date = parse(timeStr, 'HH:mm:ss', new Date())

			if (format === '24') {
				return {
					hour: formatDate(date, 'HH'),
					minute: formatDate(date, 'mm'),
					period: '',
				}
			}

			return {
				hour: formatDate(date, 'hh'),
				minute: formatDate(date, 'mm'),
				period: formatDate(date, 'a').toUpperCase(),
			}
		} catch {
			return { hour: '', minute: '', period: '' }
		}
	}

	// Convierte los componentes del UI a valor interno (HH:mm:ss)
	const formatTime = (hour: string, minute: string, period: string) => {
		if (!hour || !minute) return ''

		try {
			if (format === '24') {
				const date = parse(`${hour}:${minute}`, 'HH:mm', new Date())
				return formatDate(date, 'HH:mm:ss')
			}

			if (!period) return ''

			const date = parse(
				`${hour}:${minute} ${period}`,
				'hh:mm a',
				new Date(),
			)
			return formatDate(date, 'HH:mm:ss')
		} catch {
			return ''
		}
	}

	// Formatea el valor interno para mostrar en el botón
	const formatDisplayTime = (timeStr: string | null) => {
		if (!timeStr) return null

		try {
			const date = parse(timeStr, 'HH:mm:ss', new Date())
			return format === '24'
				? formatDate(date, 'HH:mm')
				: formatDate(date, 'hh:mm a').toUpperCase()
		} catch {
			return null
		}
	}

	const { hour, minute, period } = parseTime(value ?? null)

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

	const handleTimeChange = (
		newHour: string,
		newMinute: string,
		newPeriod: string,
	) => {
		const formatted = formatTime(newHour, newMinute, newPeriod)
		const newValue = formatted || null
		onValueChange?.(newValue)

		// Validar en tiempo real si hay error
		if (error && validate && newValue) {
			const validationError = validate(newValue)
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
						<button
							id={inputId}
							type='button'
							disabled={disabled}
							className={cn(
								'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow]',
								'focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
								'disabled:cursor-not-allowed disabled:opacity-50',
								!value && 'text-muted-foreground',
								hasError &&
									'border-destructive ring-destructive/20',
							)}
						>
							<span>
								{formatDisplayTime(value ?? null) ||
									placeholder ||
									'Selecciona una hora'}
							</span>
							<Clock className='size-4 opacity-50' />
						</button>
					}
				/>
				<PopoverContent className='w-auto p-0' align='start'>
					<div className='flex h-64 divide-x'>
						{/* Hours */}
						<ScrollArea className='w-16'>
							<div className='p-1'>
								{hours.map((h) => (
									<button
										key={h}
										onClick={() =>
											handleTimeChange(
												h,
												minute || '00',
												period || 'AM',
											)
										}
										className={cn(
											'w-full rounded px-3 py-2 text-center text-sm transition-colors hover:bg-accent',
											hour === h &&
												'bg-primary text-primary-foreground hover:bg-primary/90',
										)}
										type='button'
									>
										{h}
									</button>
								))}
							</div>
						</ScrollArea>

						{/* Minutes */}
						<ScrollArea className='w-16'>
							<div className='p-1'>
								{minutes.map((m) => (
									<button
										key={m}
										onClick={() =>
											handleTimeChange(
												hour || '12',
												m,
												period || 'AM',
											)
										}
										className={cn(
											'w-full rounded px-3 py-2 text-center text-sm transition-colors hover:bg-accent',
											minute === m &&
												'bg-primary text-primary-foreground hover:bg-primary/90',
										)}
										type='button'
									>
										{m}
									</button>
								))}
							</div>
						</ScrollArea>

						{/* AM/PM */}
						{format === '12' && (
							<ScrollArea className='w-16'>
								<div className='p-1'>
									{periods.map((p) => (
										<button
											key={p}
											onClick={() =>
												handleTimeChange(
													hour || '12',
													minute || '00',
													p,
												)
											}
											className={cn(
												'w-full rounded px-3 py-2 text-center text-sm transition-colors hover:bg-accent',
												period === p &&
													'bg-primary text-primary-foreground hover:bg-primary/90',
											)}
											type='button'
										>
											{p}
										</button>
									))}
								</div>
							</ScrollArea>
						)}
					</div>
				</PopoverContent>
			</Popover>

			{error && <p className='text-sm text-destructive mt-1'>{error}</p>}
		</div>
	)
}

TimeField.displayName = 'TimeField'

export default TimeField
