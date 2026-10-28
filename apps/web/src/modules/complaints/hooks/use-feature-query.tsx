import { useEffect, useState } from 'react'
import { PageLoading } from '@/shared/components/page-loading'
import { Button } from '@/shared/components/ui/button'
import { errorMessage } from '../api'

export function useFeatureQuery<T>(load: (signal: AbortSignal) => Promise<T>) {
	const [state, setState] = useState<{
		data: T | null
		error: string | null
		loading: boolean
		loader: typeof load
	}>({ data: null, error: null, loading: true, loader: load })

	const [revision, setRevision] = useState(0)
	// biome-ignore lint/correctness/useExhaustiveDependencies: La revisión permite recargar explícitamente la misma consulta.
	useEffect(() => {
		const controller = new AbortController()

		setState((previous) => ({
			data: previous.loader === load ? previous.data : null,
			error: null,
			loading: true,
			loader: load,
		}))

		load(controller.signal)
			.then((data) => {
				if (!controller.signal.aborted) {
					setState({
						data,
						error: null,
						loading: false,
						loader: load,
					})
				}
			})
			.catch((error) => {
				if (!controller.signal.aborted) {
					setState((previous) => ({
						data: previous.loader === load ? previous.data : null,
						error: errorMessage(error),
						loading: false,
						loader: load,
					}))
				}
			})

		return () => controller.abort()
	}, [load, revision])

	return {
		data: state.loader === load ? state.data : null,
		error: state.loader === load ? state.error : null,
		loading: state.loader !== load || state.loading,
		refreshing:
			state.loader === load && state.data !== null && state.loading,
		reload: () => setRevision((value) => value + 1),
	}
}

export function QueryState({
	error,
	reload,
}: {
	error: string | null
	reload: () => void
}) {
	if (!error) {
		return <PageLoading />
	}

	return (
		<div className='space-y-3 p-6' role='alert'>
			<p className='text-destructive'>{error}</p>
			{error && (
				<Button variant='outline' onClick={reload}>
					Reintentar
				</Button>
			)}
		</div>
	)
}
