import type { LoaderFunctionArgs } from 'react-router'
import { getPublicBook } from '../features/public-book/api'

export function publicBookLoader({ params, request }: LoaderFunctionArgs) {
	const kind = new URL(request.url).pathname.startsWith('/s/')
		? 'store'
		: 'organization'

	return {
		book: getPublicBook(params.slug ?? '', kind, request.signal).then(
			(data) => ({ data, error: null }),
			(cause: unknown) => ({
				data: null,
				error:
					cause instanceof Error
						? cause.message
						: 'No se pudieron cargar los datos del libro.',
			}),
		),
	}
}
