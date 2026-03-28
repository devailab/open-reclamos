import { DOCUMENT_LOOKUP_PROVIDER } from '@/lib/config'
import { ApiPeruDevProvider } from './api-peru-dev.provider'
import { JsonPeProvider } from './json-pe.provider'
import type { DocumentLookupProvider } from './types'

export type { DocumentLookupProvider, RucData } from './types'
export { RucNotFoundError } from './types'

/**
 * Devuelve el proveedor de consulta de documentos configurado en las variables de entorno.
 * Lanza un error si el proveedor no tiene token configurado.
 */
export function getDocumentLookupProvider(): DocumentLookupProvider {
	switch (DOCUMENT_LOOKUP_PROVIDER) {
		case 'API_PERU_DEV': {
			const token = process.env.DOCUMENT_LOOKUP_API_PERU_DEV_TOKEN
			const url =
				process.env.DOCUMENT_LOOKUP_API_PERU_DEV_URL ??
				'https://apiperu.dev'
			if (!token)
				throw new Error(
					'DOCUMENT_LOOKUP_API_PERU_DEV_TOKEN no configurado',
				)
			return new ApiPeruDevProvider(url, token)
		}
		default: {
			const token = process.env.DOCUMENT_LOOKUP_JSON_PE_TOKEN
			const url =
				process.env.DOCUMENT_LOOKUP_JSON_PE_URL ?? 'https://api.json.pe'
			if (!token)
				throw new Error('DOCUMENT_LOOKUP_JSON_PE_TOKEN no configurado')
			return new JsonPeProvider(url, token)
		}
	}
}
