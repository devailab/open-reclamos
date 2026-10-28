import { useEffect, useState } from 'react'
import { PageLoading } from '@/shared/components/page-loading'
import { Button } from '@/shared/components/ui/button'
import { getNotices } from './api'
import type { NoticeContext } from './types'

export function useNotices() {
	const [context, setContext] = useState<NoticeContext | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [revision, setRevision] = useState(0)
	// biome-ignore lint/correctness/useExhaustiveDependencies: revision dispara intencionalmente una nueva carga al pulsar Reintentar.
	useEffect(() => {
		const controller = new AbortController()

		setContext(null)
		setError(null)

		getNotices(controller.signal)
			.then((context) => {
				if (!controller.signal.aborted) {
					setContext(context)
				}
			})
			.catch((error) => {
				if (!controller.signal.aborted) {
					setError(
						error instanceof Error
							? error.message
							: 'No se pudieron cargar los avisos.',
					)
				}
			})

		return () => controller.abort()
	}, [revision])

	const fallback = error ? (
		<div role='alert' className='space-y-3'>
			<p>{error}</p>
			<Button
				variant='outline'
				onClick={() => setRevision((value) => value + 1)}
			>
				Reintentar
			</Button>
		</div>
	) : (
		<PageLoading className='flex-1' />
	)

	return { context, fallback }
}
