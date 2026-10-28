export type ExportFormat = 'pdf' | 'xlsx'

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
		description: 'Libro de reclamos generado en el servidor',
	},
	{
		value: 'xlsx',
		label: 'Excel',
		description: 'Hoja de cálculo compatible con Microsoft Excel',
	},
]
