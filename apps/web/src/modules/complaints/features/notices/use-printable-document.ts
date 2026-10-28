import { useEffect, useMemo, useState } from 'react'
import { useDebounce } from '@/shared/hooks/use-debounce'
import type { getPrintableNotice, PrintableNoticeInput } from './api'
import {
	createNoticeDocumentLoader,
	noticeDocumentKey,
} from './document-loader'

export function usePrintableDocument(input: PrintableNoticeInput) {
	const loader = useMemo(() => createNoticeDocumentLoader(), [])
	const debouncedInput = useDebounce(input, 600)

	const [document, setDocument] = useState<{
		key: string
		url: string
		response: Awaited<ReturnType<typeof getPrintableNotice>>
	} | null>(null)

	const [error, setError] = useState<{ key: string; message: string } | null>(
		null,
	)

	const [attempt, setAttempt] = useState(0)
	let key: string | null = null
	let validationError: string | null = null

	try {
		key = noticeDocumentKey(input)
	} catch (cause) {
		validationError =
			cause instanceof Error ? cause.message : 'Enlace inválido.'
	}

	useEffect(() => () => loader.cancel(), [loader])

	useEffect(
		() => () => {
			if (document) {
				URL.revokeObjectURL(document.url)
			}
		},
		[document],
	)
	// biome-ignore lint/correctness/useExhaustiveDependencies: attempt vuelve a cargar la vista previa al pulsar Reintentar.
	useEffect(() => {
		let active = true
		let requestKey: string | undefined

		setDocument(null)
		setError(null)

		try {
			requestKey = noticeDocumentKey(debouncedInput)

			const currentKey = requestKey

			loader
				.load(debouncedInput)
				.then((response) => {
					if (!active) {
						return
					}

					const url = URL.createObjectURL(
						new Blob([new Uint8Array(response.document)], {
							type: 'application/pdf',
						}),
					)

					setDocument({ key: currentKey, url, response })
				})
				.catch((cause) => {
					if (active) {
						setError({
							key: currentKey,
							message:
								cause instanceof Error
									? cause.message
									: 'No se pudo generar el PDF.',
						})
					}
				})
		} catch (cause) {
			if (requestKey) {
				setError({
					key: requestKey,
					message:
						cause instanceof Error
							? cause.message
							: 'Enlace inválido.',
				})
			}
		}

		return () => {
			active = false

			if (requestKey) {
				loader.cancel(requestKey)
			}
		}
	}, [loader, debouncedInput, attempt])

	return {
		key,
		document: document?.key === key ? document : null,
		error: validationError ?? (error?.key === key ? error.message : null),
		getDocument: () => loader.load(input),
		retry: () => setAttempt((value) => value + 1),
	}
}
