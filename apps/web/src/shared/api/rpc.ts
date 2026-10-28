import type { JsonObject } from '@bufbuild/protobuf'
import {
	type Client,
	Code,
	ConnectError,
	createClient,
	type Interceptor,
} from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-web'
import {
	BackendService,
	OpAcceptInvitation,
	OpCompleteSetup,
	OpCreateOrganization,
	type OperationResponse,
	OpGetSession,
	OpInstall,
	OpLogin,
	OpLogout,
	OpRefreshToken,
	OpRegister,
	OpSwitchOrganization,
	SystemService,
} from '@open-reclamos/rpc-client'
import { createAccessTokenStore } from '../auth/access-token'
import { createAuthCoordinator } from '../auth/auth-refresh'
import {
	beginContextChange,
	contextSignal,
	contextVersion,
	endContextChange,
	waitForContext,
} from '../auth/context'

const access = createAccessTokenStore()

// muestra solo el mensaje y conserva el código para manejar el error.
const errorMessageInterceptor: Interceptor = (next) => async (request) => {
	try {
		return await next(request)
	} catch (error) {
		if (error instanceof ConnectError) {
			error.message = error.rawMessage
		}

		throw error
	}
}

function acceptAccess(response: Partial<OperationResponse>) {
	if (response.accessToken) {
		access.set(response.accessToken, Number(response.accessExpiresAt))
	}
}

const refreshClient = createClient(
	BackendService,
	createConnectTransport({
		baseUrl: '/rpc',
		defaultTimeoutMs: 30_000,
		interceptors: [errorMessageInterceptor],
	}),
)

const auth = createAuthCoordinator(async () => {
	let response: OperationResponse

	try {
		response = await refreshClient.refreshToken({})
	} catch (error) {
		if (
			ConnectError.from(error).code === Code.Unauthenticated &&
			typeof window !== 'undefined'
		) {
			access.clear()
			window.dispatchEvent(new Event('open-reclamos-auth-expired'))
		}

		throw error
	}

	if (response.data?.success !== true || !response.accessToken) {
		throw new Error('No se pudo renovar el acceso.')
	}

	acceptAccess(response)
})

const contextMethods = new Set<string>([
	OpLogin,
	OpRegister,
	OpInstall,
	OpLogout,
	OpAcceptInvitation,
	OpSwitchOrganization,
	OpCreateOrganization,
	OpCompleteSetup,
])

const noRefreshMethods = new Set<string>([
	OpLogin,
	OpRegister,
	OpInstall,
	OpLogout,
	OpAcceptInvitation,
	OpRefreshToken,
])

const refreshInterceptor: Interceptor = (next) => async (request) => {
	const name = request.method.name
	let version = auth.version

	const send = async () => {
		const token = access.get()

		if (token) {
			request.header.set('Authorization', `Bearer ${token}`)
		} else {
			request.header.delete('Authorization')
		}

		const response = await next(request)

		if (!response.stream) {
			acceptAccess(response.message as Partial<OperationResponse>)
		}

		if (name === OpLogout) {
			access.clear()
		}
		return response
	}

	const attempt = () =>
		contextMethods.has(name)
			? auth.changeContext(async () => {
					beginContextChange()

					try {
						return await send()
					} finally {
						endContextChange()
					}
				})
			: send()
	// Al recargar, la memoria está vacía: recuperar el access antes de consultar al usuario.
	if (name === OpGetSession && !access.get()) {
		request.signal.throwIfAborted()
		await auth.renew(version)
		request.signal.throwIfAborted()

		if (!access.get()) {
			throw new ConnectError(
				'Inicia sesión para continuar.',
				Code.Unauthenticated,
			)
		}

		version = auth.version
	}

	try {
		return await attempt()
	} catch (error) {
		if (
			noRefreshMethods.has(name) ||
			ConnectError.from(error).code !== Code.Unauthenticated ||
			request.signal.aborted
		) {
			throw error
		}

		try {
			await auth.renew(version)
		} catch {
			throw error
		}

		request.signal.throwIfAborted()

		return attempt()
	}
}

export async function authenticatedFetch(
	input: string,
	init: RequestInit = {},
): Promise<Response> {
	await waitForContext(init.signal ?? undefined)

	const tenantSignal = contextSignal()

	init = {
		...init,
		signal: init.signal
			? AbortSignal.any([init.signal, tenantSignal])
			: tenantSignal,
	}

	const version = auth.version

	if (
		typeof window !== 'undefined' &&
		new URL(input, window.location.href).origin !== window.location.origin
	) {
		throw new Error('La solicitud autenticada debe usar el mismo origen.')
	}

	const send = () => {
		const headers = new Headers(init.headers)
		const token = access.get()

		if (token) {
			headers.set('Authorization', `Bearer ${token}`)
		} else {
			headers.delete('Authorization')
		}

		return fetch(input, { ...init, headers, credentials: 'same-origin' })
	}

	const response = await send()

	if (response.status !== 401 || init.signal?.aborted) {
		return response
	}

	await auth.renew(version)
	init.signal?.throwIfAborted()

	return send()
}

export async function downloadAuthenticatedFile(
	path: string,
	fileName: string,
) {
	const response = await authenticatedFetch(path)

	if (!response.ok) {
		throw new Error(
			'No se pudo descargar el archivo. Comprueba tus permisos.',
		)
	}

	const url = URL.createObjectURL(await response.blob())
	const link = document.createElement('a')

	link.href = url
	link.download = fileName
	document.body.append(link)
	link.click()
	link.remove()
	window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const transport = createConnectTransport({
	baseUrl: '/rpc',
	defaultTimeoutMs: 30_000,
	interceptors: [errorMessageInterceptor, refreshInterceptor],
})

export const systemClient = createClient(SystemService, transport)
export const backendClient = createClient(BackendService, transport)

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

// El contrato usa Struct; se omiten campos opcionales sin valor, sin cambiar
// los nombres snake_case ni convertir importes o identificadores a números.
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

export async function requestRPC(
	method: RPCMethod,
	input: RPCInput = {},
	signal?: AbortSignal,
): Promise<OperationResponse> {
	if (!contextMethods.has(method)) {
		await waitForContext(signal)

		const tenantSignal = contextSignal()

		signal = signal ? AbortSignal.any([signal, tenantSignal]) : tenantSignal
	}

	signal?.throwIfAborted()

	const tenantVersion = contextVersion()

	const name =
		`${method.charAt(0).toLowerCase()}${method.slice(1)}` as keyof Client<
			typeof BackendService
		>

	const operation = backendClient[name]

	if (!operation) {
		throw new Error(`Operación RPC desconocida: ${method}`)
	}

	const response = await operation(
		{
			id: input.id,
			data: jsonObject(input.data),
			filters: jsonObject(input.filters),
			page: input.page,
			pageSize: input.pageSize,
		},
		{ signal },
	)

	if (!contextMethods.has(method)) {
		signal?.throwIfAborted()

		if (tenantVersion !== contextVersion()) {
			throw new DOMException('', 'AbortError')
		}
	}

	return response
}

export async function rpc<T>(
	method: RPCMethod,
	input: RPCInput = {},
	signal?: AbortSignal,
): Promise<T> {
	const response = await requestRPC(method, input, signal)

	return (response.data ?? {}) as T
}

export function saveDocument(
	response: Pick<OperationResponse, 'document' | 'fileName' | 'contentType'>,
) {
	if (!response.document.length) {
		return
	}

	const url = URL.createObjectURL(
		new Blob([new Uint8Array(response.document)], {
			type: response.contentType || 'application/octet-stream',
		}),
	)

	const link = document.createElement('a')

	link.href = url
	link.download = response.fileName || 'documento.pdf'
	document.body.append(link)
	link.click()
	link.remove()
	window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadRPC(
	method: RPCMethod,
	input: RPCInput = {},
	signal?: AbortSignal,
): Promise<OperationResponse> {
	const response = await requestRPC(method, input, signal)

	signal?.throwIfAborted()
	saveDocument(response)

	return response
}
