// Coordina renovación y cambios de empresa para evitar respuestas que restauren el contexto anterior.
export function createAuthCoordinator(refresh: () => Promise<void>) {
	let version = 0
	let pending: Promise<void> | null = null
	let tail = Promise.resolve()

	function exclusive<T>(operation: () => Promise<T>): Promise<T> {
		const result = tail.then(operation)

		tail = result.then(
			() => {},
			() => {},
		)

		return result
	}

	return {
		get version() {
			return version
		},
		renew(observedVersion = version): Promise<void> {
			if (observedVersion !== version) {
				return Promise.resolve()
			}
			if (pending) {
				return pending
			}

			pending = exclusive(async () => {
				if (observedVersion !== version) {
					return
				}

				await refresh()
				version++
			}).finally(() => {
				pending = null
			})

			return pending
		},
		changeContext<T>(operation: () => Promise<T>): Promise<T> {
			return exclusive(async () => {
				const result = await operation()

				version++

				return result
			})
		},
	}
}
