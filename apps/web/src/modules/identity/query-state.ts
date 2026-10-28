export interface QueryState<T> {
	data: T | null
	error: string | null
	loading: boolean
}

export function currentQueryState<T>(
	state: QueryState<T> & { source: unknown; version: number },
	source: unknown,
	version: number,
): QueryState<T> {
	return state.source === source && state.version === version
		? state
		: { data: null, error: null, loading: true }
}
