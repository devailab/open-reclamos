import type { RPCMethod } from '@/shared/api/rpc'
import { type RPCInput, rpc } from '@/shared/api/rpc'

export type Request = typeof rpc

export function record(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error('La respuesta del servidor no es válida.')
	}

	return value as Record<string, unknown>
}

export function text(value: unknown): string {
	if (typeof value !== 'string' || !value.trim()) {
		throw new Error('La respuesta del servidor no es válida.')
	}

	return value
}

export function parsePage<T>(
	value: unknown,
	parse: (row: unknown) => T,
): { rows: T[]; total: number } {
	const data = record(value)

	if (
		!Number.isSafeInteger(data.total) ||
		(data.total as number) < 0 ||
		(data.rows !== null && !Array.isArray(data.rows))
	) {
		throw new Error('La lista del servidor no es válida.')
	}

	const rows = (data.rows ?? []) as unknown[]

	if (
		rows.length > (data.total as number) ||
		(rows.length === 0 && data.total !== 0)
	) {
		throw new Error('La lista del servidor está incompleta.')
	}

	return { rows: rows.map(parse), total: data.total as number }
}

export async function listRecords<T>(
	method: RPCMethod,
	parse: (row: unknown) => T,
	signal?: AbortSignal,
	request: Request = rpc,
	input: RPCInput = {},
): Promise<T[]> {
	const rows: T[] = []

	for (let page = 1; page <= 100000; page++) {
		signal?.throwIfAborted()

		const response = await request<unknown>(
			method,
			{ ...input, page, pageSize: 100 },
			signal,
		)

		signal?.throwIfAborted()

		const chunk = parsePage(response, parse)

		rows.push(...chunk.rows)

		if (rows.length >= chunk.total) {
			return rows
		}
	}

	throw new Error('La lista del servidor es demasiado grande.')
}

export function success(value: unknown) {
	if (record(value).success !== true) {
		throw new Error('El servidor no confirmó la operación.')
	}
}

export function loginResult(value: unknown) {
	return text(record(record(value).user).id)
}
