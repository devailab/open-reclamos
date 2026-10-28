import { FileDown, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { sileo } from 'sileo'
import DateField from '@/shared/components/forms/date-field'
import SelectField from '@/shared/components/forms/select-field'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { useForm } from '@/shared/hooks/use-form'
import { required } from '@/shared/lib/validators'
import { exportBook, type StoreOption } from './api'
import {
	EXPORT_FORMAT_OPTIONS,
	type ExportFormat,
	type ExportFormValues,
	getDefaultStartDate,
} from './types'

interface ExportFormProps {
	stores: StoreOption[]
}

const FORMAT_ICONS: Record<ExportFormat, typeof FileText> = {
	pdf: FileText,
	xlsx: FileSpreadsheet,
}

const FORMAT_MESSAGES: Record<ExportFormat, string> = {
	pdf: 'Generando el libro PDF...',
	xlsx: 'Exportando archivo Excel...',
}

export function ExportForm({ stores }: ExportFormProps) {
	const today = new Date()

	const [values, setValues] = useState<ExportFormValues>({
		storeId: stores.length === 1 ? (stores[0]?.id ?? null) : null,
		startDate: getDefaultStartDate(today),
		endDate: today,
		format: 'pdf',
	})

	const [isExporting, setIsExporting] = useState(false)

	const abortRef = useRef<AbortController | null>(null)
	const [jobId, setJobId] = useState<string | undefined>()

	useEffect(() => () => abortRef.current?.abort(), [])

	const { register, validate } = useForm({ values, setValues })

	const storeOptions = stores.map((s) => ({ value: s.id, label: s.name }))

	const handleExport = async () => {
		const errors = validate()

		if (errors.length > 0) {
			return
		}

		if (!values.storeId || !values.startDate || !values.endDate) {
			return
		}

		if (values.startDate > values.endDate) {
			sileo.error({
				title: 'Rango de fechas inválido',
				description:
					'La fecha de inicio debe ser anterior a la fecha fin.',
			})

			return
		}

		setIsExporting(true)

		const abort = new AbortController()

		abortRef.current = abort

		try {
			await exportBook(values, abort.signal, setJobId, jobId)
			setJobId(undefined)

			sileo.success({
				title: 'Exportación completada',
				description: 'El archivo se descargó correctamente.',
			})
		} catch (error) {
			if (!abort.signal.aborted) {
				sileo.error({
					title: 'Error al exportar',
					description:
						error instanceof Error
							? error.message
							: 'No se pudo conectar al servidor.',
				})
			}
		} finally {
			if (!abort.signal.aborted) {
				setIsExporting(false)
			}
		}
	}

	return (
		<div className='max-w-2xl space-y-6'>
			<Card>
				<CardContent className='space-y-5 pt-6'>
					<SelectField
						{...register('storeId')}
						value={
							storeOptions.find(
								(o) => o.value === values.storeId,
							) ?? null
						}
						onValueChange={(option) =>
							setValues((prev) => ({
								...prev,
								storeId: option?.value ?? null,
							}))
						}
						label='Tienda'
						placeholder='Selecciona una tienda'
						options={storeOptions}
						validate={(opt) => required(opt?.value ?? null)}
						disabled={isExporting || Boolean(jobId)}
					/>

					<div className='grid grid-cols-2 gap-4'>
						<DateField
							{...register('startDate')}
							label='Fecha de inicio'
							placeholder='Fecha de inicio'
							maxDate={values.endDate ?? today}
							validate={required}
							disabled={isExporting || Boolean(jobId)}
						/>
						<DateField
							{...register('endDate')}
							label='Fecha de fin'
							placeholder='Fecha de fin'
							minDate={values.startDate ?? undefined}
							maxDate={today}
							validate={required}
							disabled={isExporting || Boolean(jobId)}
						/>
					</div>

					<div className='space-y-2'>
						<p className='text-sm font-medium'>
							Formato de exportación
						</p>
						<div className='grid grid-cols-3 gap-3'>
							{EXPORT_FORMAT_OPTIONS.map((option) => {
								const Icon = FORMAT_ICONS[option.value]

								const isSelected =
									values.format === option.value

								return (
									<button
										key={option.value}
										type='button'
										disabled={isExporting || Boolean(jobId)}
										onClick={() =>
											setValues((prev) => ({
												...prev,
												format: option.value,
											}))
										}
										className={`flex flex-col items-start gap-1.5 rounded-lg border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${
											isSelected
												? 'border-primary bg-primary/5 ring-1 ring-primary'
												: 'border-border bg-card hover:border-muted-foreground/40 hover:bg-accent'
										}`}
									>
										<Icon
											className={`size-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
										/>
										<span
											className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}
										>
											{option.label}
										</span>
										<span className='text-xs text-muted-foreground leading-tight'>
											{option.description}
										</span>
									</button>
								)
							})}
						</div>
					</div>
				</CardContent>
			</Card>

			{jobId && (
				<div className='space-y-2'>
					<p className='text-sm text-muted-foreground'>
						Exportación: {jobId}. Puedes consultar de nuevo sin
						crear otro trabajo. Los archivos caducan en 24 horas.
					</p>
					<Button
						variant='ghost'
						disabled={isExporting}
						onClick={() => setJobId(undefined)}
					>
						Nueva exportación
					</Button>
				</div>
			)}
			<Button
				onClick={handleExport}
				disabled={isExporting || Boolean(jobId)}
				size='lg'
				className='w-full'
			>
				{isExporting ? (
					<>
						<Loader2 className='size-4 animate-spin' />
						{FORMAT_MESSAGES[values.format]}
					</>
				) : (
					<>
						<FileDown className='size-4' />
						{jobId
							? 'Consultar y descargar exportación'
							: 'Exportar'}
					</>
				)}
			</Button>
		</div>
	)
}
