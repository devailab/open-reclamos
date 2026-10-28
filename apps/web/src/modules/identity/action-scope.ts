export function createActionScope() {
	let current: AbortController | null = null

	return {
		begin() {
			current?.abort()
			current = new AbortController()

			return current.signal
		},
		cancel() {
			current?.abort()
		},
	}
}

export function navigateSession(
	destination: string,
	signal: AbortSignal,
	navigate: (path: string, options: { replace: boolean }) => void,
	refresh: () => Promise<void>,
) {
	signal.throwIfAborted()
	// Navegar antes de refresh: los guards desmontan la pantalla al empezar la recarga.
	navigate(destination, { replace: true })
	void refresh()
}
