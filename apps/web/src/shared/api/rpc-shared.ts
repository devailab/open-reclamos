import type { JsonObject } from '@bufbuild/protobuf'
import {
	type Client,
	ConnectError,
	type Interceptor,
} from '@connectrpc/connect'
import type { BackendService } from '@open-reclamos/rpc-client'

// muestra solo el mensaje y conserva el código para manejar el error.
export const errorMessageInterceptor: Interceptor =
	(next) => async (request) => {
		try {
			return await next(request)
		} catch (error) {
			if (error instanceof ConnectError) {
				error.message = error.rawMessage
			}

			throw error
		}
	}

export type RPCMethod = Capitalize<
	Extract<keyof Client<typeof BackendService>, string>
>

export interface RPCInput {
	id?: string
	data?: Record<string, unknown>
	filters?: Record<string, unknown>
	page?: number
	pageSize?: number
}

// conserva snake_case y los importes al preparar los datos para struct.
export function jsonObject(
	value?: Record<string, unknown>,
): JsonObject | undefined {
	if (!value) {
		return undefined
	}

	return JSON.parse(
		JSON.stringify(value, (_key, item: unknown) => {
			if (typeof item === 'bigint') {
				return item.toString()
			}

			if (typeof item === 'number' && !Number.isFinite(item)) {
				throw new Error('La solicitud contiene un número no válido.')
			}

			return item
		}),
	) as JsonObject
}
