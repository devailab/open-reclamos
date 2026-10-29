import { createClient } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-web'
import {
	BackendService,
	type OpGetPublicBook,
	type OpListCountries,
	type OpListUbigeos,
	type OpSubmitComplaint,
	type OpTrackComplaint,
} from '@open-reclamos/rpc-client'
import {
	errorMessageInterceptor,
	jsonObject,
	type RPCInput,
} from './rpc-shared'

// estas operaciones no dependen de la sesión ni de la empresa activa.
type PublicMethod =
	| typeof OpGetPublicBook
	| typeof OpListCountries
	| typeof OpListUbigeos
	| typeof OpSubmitComplaint
	| typeof OpTrackComplaint

const client = createClient(
	BackendService,
	createConnectTransport({
		baseUrl: '/rpc',
		defaultTimeoutMs: 30_000,
		interceptors: [errorMessageInterceptor],
		fetch: ((input, init) =>
			fetch(input, { ...init, credentials: 'omit' })) as typeof fetch,
	}),
)

export async function publicRPC<T>(
	method: PublicMethod,
	input: RPCInput = {},
	signal?: AbortSignal,
): Promise<T> {
	signal?.throwIfAborted()

	const name =
		`${method.charAt(0).toLowerCase()}${method.slice(1)}` as Uncapitalize<PublicMethod>
	const response = await client[name](
		{
			id: input.id,
			data: jsonObject(input.data),
			filters: jsonObject(input.filters),
			page: input.page,
			pageSize: input.pageSize,
		},
		{ signal },
	)

	return (response.data ?? {}) as T
}
