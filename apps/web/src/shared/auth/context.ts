let version = 0
let controller = new AbortController()
let pending: Promise<void> | null = null
let settle: (() => void) | null = null
const listeners = new Set<(changing: boolean) => void>()

export const contextVersion = () => version
export const contextSignal = () => controller.signal

export async function waitForContext(signal?: AbortSignal) {
	signal?.throwIfAborted()

	if (pending) {
		await pending
	}

	signal?.throwIfAborted()
}

export function subscribeContext(listener: (changing: boolean) => void) {
	listeners.add(listener)

	return () => {
		listeners.delete(listener)
	}
}

export function beginContextChange() {
	version++
	controller.abort()
	controller = new AbortController()

	pending = new Promise((resolve) => {
		settle = resolve
	})

	for (const listener of listeners) {
		listener(true)
	}
}

export function endContextChange() {
	settle?.()
	pending = null
	settle = null

	for (const listener of listeners) {
		listener(false)
	}
}
