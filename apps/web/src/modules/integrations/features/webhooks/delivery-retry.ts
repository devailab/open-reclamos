import { OpListDeliveries } from '@open-reclamos/rpc-client'
import { rpc } from '@/shared/api/rpc'
import { getEndpointOptions, retryDelivery } from './api'
import type { DeliveryRecord, WebhookDeliveryRow } from './types'

export function deliveryRetryBlockReason(
	row: Pick<WebhookDeliveryRow, 'status' | 'endpointId' | 'endpointStatus'>,
): string | null {
	if (row.status === 'sent') {
		return 'La entrega ya fue enviada.'
	}

	if (!row.endpointId || row.endpointStatus === null) {
		return 'El webhook fue eliminado o ya no está disponible. No se puede reintentar.'
	}

	if (row.endpointStatus !== 'active') {
		return 'El webhook está inactivo. Actívalo antes de reintentar.'
	}

	return null
}

export function retryDelay(ms: number, signal: AbortSignal): Promise<void> {
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

export async function waitForDeliveryChange(
	initial: WebhookDeliveryRow,
	signal: AbortSignal,
	wait = retryDelay,
) {
	for (let attempt = 0; attempt < 15; attempt++) {
		signal.throwIfAborted()
		await wait(2000, signal)
		signal.throwIfAborted()

		const result = await rpc<{ rows: DeliveryRecord[] | null }>(
			OpListDeliveries,
			{
				page: 1,
				pageSize: 100,
				filters: { endpoint_id: initial.endpointId },
			},
			signal,
		)

		signal.throwIfAborted()

		const row = (Array.isArray(result.rows) ? result.rows : []).find(
			(row) => row.id === initial.id,
		)

		if (!row) {
			return { kind: 'unavailable' as const }
		}
		// Un intento nuevo puede volver a fallar sin cambiar status; el contador
		// permite distinguir ese resultado del fallo previo al encolado.
		if (
			(row.status === 'sent' || row.status === 'failed') &&
			(row.status !== initial.status ||
				row.attempt_count > initial.attemptCount)
		) {
			return { kind: 'completed' as const, row }
		}
	}

	return { kind: 'timeout' as const }
}

export async function retryDeliveryAndWait(
	row: WebhookDeliveryRow,
	signal: AbortSignal,
	onQueued: () => void,
	wait = retryDelay,
) {
	signal.throwIfAborted()

	const reason = deliveryRetryBlockReason(row)

	if (reason) {
		throw new Error(reason)
	}

	const endpoints = await getEndpointOptions(signal)

	signal.throwIfAborted()

	const currentReason = deliveryRetryBlockReason({
		...row,
		endpointStatus:
			endpoints.find((endpoint) => endpoint.id === row.endpointId)
				?.status ?? null,
	})

	if (currentReason) {
		throw new Error(currentReason)
	}

	const result = await retryDelivery(row.id, signal)

	if ('error' in result) {
		throw new Error(result.error)
	}

	signal.throwIfAborted()
	onQueued()

	return waitForDeliveryChange(row, signal, wait)
}
