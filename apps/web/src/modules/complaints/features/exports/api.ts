import {
	OpExportBook,
	OpGetExport,
	OpListStores,
} from '@open-reclamos/rpc-client'
import { format } from 'date-fns'
import { authenticatedFetch, requestRPC, rpc } from '@/shared/api/rpc'
import type { ExportFormValues } from './types'

export interface StoreOption {
	id: string
	name: string
}

interface ExportJob {
	id: string
	status: 'queued' | 'running' | 'completed' | 'failed'
	error?: string | null
	download_url?: string
}

export function exportInput(values: ExportFormValues) {
	if (!values.storeId || !values.startDate || !values.endDate) {
		throw new Error('Selecciona una tienda y un rango de fechas.')
	}

	if (values.startDate > values.endDate) {
		throw new Error('La fecha de inicio debe ser anterior a la fecha fin.')
	}

	return {
		data: { format: values.format },
		filters: {
			store_id: values.storeId,
			date_start: format(values.startDate, 'yyyy-MM-dd'),
			date_end: format(values.endDate, 'yyyy-MM-dd'),
		},
	}
}

export async function getExportStores(signal?: AbortSignal) {
	const stores: StoreOption[] = []

	for (let page = 1; ; page++) {
		const result = await rpc<{ rows: StoreOption[] | null; total: number }>(
			OpListStores,
			{ page, pageSize: 100 },
			signal,
		)

		stores.push(...(Array.isArray(result.rows) ? result.rows : []))

		if (
			stores.length >= (result.total ?? stores.length) ||
			!Array.isArray(result.rows) ||
			!result.rows.length
		) {
			return stores
		}
	}
}

export function saveBlob(blob: Blob, fileName: string) {
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')

	link.href = url
	link.download = fileName
	link.click()
	window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function pollExport(
	id: string,
	signal: AbortSignal,
	wait = abortableDelay,
) {
	for (let attempt = 0; attempt < 120; attempt++) {
		signal.throwIfAborted()

		const job = await rpc<ExportJob>(OpGetExport, { id }, signal)

		if (job.status === 'failed') {
			throw new Error(job.error || 'No se pudo completar la exportación.')
		}

		if (job.status === 'completed') {
			return job
		}

		await wait(2000, signal)
	}

	throw new Error(
		`La exportación ${id} sigue en proceso. Vuelve a consultar su estado más tarde.`,
	)
}

function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		signal.throwIfAborted()

		const abort = () => {
			clearTimeout(timer)
			reject(signal.reason)
		}

		const timer = setTimeout(() => {
			signal.removeEventListener('abort', abort)
			resolve()
		}, ms)

		signal.addEventListener('abort', abort, { once: true })
	})
}

export async function exportBook(
	values: ExportFormValues,
	signal: AbortSignal,
	onQueued?: (id: string) => void,
	existingJobId?: string,
) {
	let id = existingJobId

	if (!id) {
		const response = await requestRPC(
			OpExportBook,
			exportInput(values),
			signal,
		)

		signal.throwIfAborted()

		if (response.document?.length) {
			const blob = new Blob([new Uint8Array(response.document)], {
				type: response.contentType,
			})

			saveBlob(blob, response.fileName || `libro.${values.format}`)

			return
		}

		const job = response.data as unknown as ExportJob

		if (!job?.id) {
			throw new Error(
				'La respuesta de exportación no contiene un documento ni un trabajo.',
			)
		}

		id = job.id
		onQueued?.(id)
	}

	await pollExport(id, signal)

	const response = await authenticatedFetch(
		`/api/exports/${encodeURIComponent(id)}`,
		{
			credentials: 'include',
			signal,
		},
	)

	if (!response.ok) {
		throw new Error(
			'No se pudo descargar la exportación. Comprueba tus permisos o su caducidad.',
		)
	}

	saveBlob(await response.blob(), `libro.${values.format}`)
}
