import { useEffect, useState } from 'react'
import { currentQueryState, type QueryState } from '../query-state'
import { errorMessage } from '../validation'

export function useAuthQuery<T>(load: (signal: AbortSignal) => Promise<T>) {
	const [state, setState] = useState<
		QueryState<T> & { source: typeof load; version: number }
	>({ data: null, error: null, loading: true, source: load, version: 0 })

	const [version, setVersion] = useState(0)

	useEffect(() => {
		const controller = new AbortController()

		setState({
			data: null,
			error: null,
			loading: true,
			source: load,
			version,
		})

		Promise.resolve()
			.then(() => {
				controller.signal.throwIfAborted()

				return load(controller.signal)
			})
			.then((data) => {
				if (!controller.signal.aborted) {
					setState({
						data,
						error: null,
						loading: false,
						source: load,
						version,
					})
				}
			})
			.catch((error: unknown) => {
				if (!controller.signal.aborted) {
					setState({
						data: null,
						error: errorMessage(error),
						loading: false,
						source: load,
						version,
					})
				}
			})

		return () => controller.abort()
	}, [load, version])
	// No exponer datos de otro token/usuario ni siquiera antes del siguiente efecto.
	return {
		...currentQueryState(state, load, version),
		retry: () => setVersion((current) => current + 1),
	}
}
