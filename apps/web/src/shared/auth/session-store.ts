import { subscribeContext, waitForContext } from './context'
import { loadSession, type Session } from './session-service'

export interface SessionSnapshot {
	session: Session | null
	loading: boolean
	error: Error | null
	tenantError: Error | null
}

const empty: SessionSnapshot = {
	session: null,
	loading: true,
	error: null,
	tenantError: null,
}

// Una fuente de sesión para React y loaders, con descarte de respuestas anteriores.
export function createSessionStore(load = loadSession) {
	let snapshot = empty
	let loaded = false
	let version = 0
	let request: AbortController | null = null
	let pending: Promise<SessionSnapshot> | null = null
	const listeners = new Set<() => void>()

	const publish = (value: SessionSnapshot) => {
		snapshot = value

		for (const listener of listeners) {
			listener()
		}
	}

	const invalidate = (preserveSnapshot = false) => {
		version++
		request?.abort()
		pending = null
		loaded = false

		if (!preserveSnapshot) {
			publish({ ...empty })
		}
	}

	const ensure = async (): Promise<SessionSnapshot> => {
		await waitForContext()

		if (loaded) {
			return snapshot
		}
		if (pending) {
			return pending
		}

		const current = version
		const controller = new AbortController()

		request = controller

		const work = (async () => {
			try {
				const result = await load(controller.signal)

				if (current === version && !controller.signal.aborted) {
					loaded = true
					publish({ ...result, loading: false, error: null })
				}
			} catch (cause) {
				if (current === version && !controller.signal.aborted) {
					loaded = true

					publish({
						...empty,
						loading: false,
						error:
							cause instanceof Error
								? cause
								: new Error(String(cause)),
					})
				}
			} finally {
				if (current === version) {
					pending = null
				}
			}
			// El llamador de una carga vieja también debe esperar el nuevo contexto.
			return current === version ? snapshot : ensure()
		})()

		pending = work

		return work
	}

	return {
		getSnapshot: () => snapshot,
		subscribe(listener: () => void) {
			listeners.add(listener)

			return () => {
				listeners.delete(listener)
			}
		},
		ensure,
		invalidate,
		async refresh() {
			invalidate()
			await ensure()
		},
		clear() {
			invalidate()
			loaded = true
			publish({ ...empty, loading: false })
		},
	}
}

export const sessionStore = createSessionStore()

subscribeContext((changing) => {
	if (changing) {
		sessionStore.invalidate(true)
	} else {
		void sessionStore.ensure()
	}
})
