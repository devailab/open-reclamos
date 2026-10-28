import type { RPCMethod } from '@/shared/api/rpc'
import { rpc } from './rpc'

interface Page<T> {
	rows: T[] | null
	total: number
}

export async function listAll<T>(
	method: RPCMethod,
	signal: AbortSignal,
	request: typeof rpc = rpc,
): Promise<T[]> {
	const items: T[] = []

	for (let page = 1; ; page++) {
		signal.throwIfAborted()

		const result = await request<Page<T>>(
			method,
			{ page, pageSize: 100 },
			signal,
		)

		signal.throwIfAborted()

		const rows = result.rows ?? []

		items.push(...rows)

		if (items.length >= result.total || !rows.length) {
			return items
		}
	}
}
