export type ExportFormat = 'pdf' | 'csv' | 'xlsx'

export interface ExportFormValues {
	storeId: string | null
	startDate: Date | null
	endDate: Date | null
	format: ExportFormat
}

export function getDefaultStartDate(today: Date): Date {
	const month = today.getMonth()
	const year = today.getFullYear()
	return month < 6 ? new Date(year, 0, 1) : new Date(year, 6, 1)
}

export const EXPORT_FORMAT_OPTIONS: Array<{
	value: ExportFormat
	label: string
	description: string
}> = [
	{
		value: 'pdf',
		label: 'PDF',
		description: 'Libro oficial con portada y constancias individuales',
	},
	{
		value: 'csv',
		label: 'CSV',
		description: 'Tabla en formato separado por punto y coma',
	},
	{
		value: 'xlsx',
		label: 'Excel',
		description: 'Hoja de cálculo compatible con Microsoft Excel',
	},
]
