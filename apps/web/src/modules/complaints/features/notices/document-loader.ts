import {
	getPrintableNotice,
	type PrintableNoticeInput,
	printableNoticeData,
} from './api'

export function noticeDocumentKey(input: PrintableNoticeInput) {
	return JSON.stringify(printableNoticeData(input))
}

// Preview, descarga e impresión comparten la solicitud; un cambio de contenido
// cancela la anterior y nunca reutiliza un PDF con otro QR, tienda u orientación.
export function createNoticeDocumentLoader(load = getPrintableNotice) {
	let current: {
		key: string
		controller: AbortController
		promise: ReturnType<typeof load>
	} | null = null

	return {
		load(input: PrintableNoticeInput) {
			const key = noticeDocumentKey(input)

			if (current?.key === key) {
				return current.promise
			}

			current?.controller.abort()

			const controller = new AbortController()

			const promise = load(input, controller.signal)
				.then((response) => {
					controller.signal.throwIfAborted()

					return response
				})
				.catch((error) => {
					if (current?.controller === controller) {
						current = null
					}
					throw error
				})

			current = { key, controller, promise }

			return promise
		},
		cancel(key?: string) {
			if (!key || current?.key === key) {
				current?.controller.abort()
				current = null
			}
		},
	}
}
