import {
	OpSuggestOrganizationSlug,
	OpSuggestStoreSlug,
} from '@open-reclamos/rpc-client'
import { useCallback, useEffect, useState } from 'react'
import { rpc } from '@/shared/api/rpc'

export type SlugKind = 'organization' | 'store'

export function validatePublicSlug(
	value: string,
	kind: SlugKind,
): string | null {
	if (
		!value ||
		value.length > (kind === 'organization' ? 100 : 120) ||
		!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
	) {
		return 'Usa letras minúsculas, números y guiones, sin espacios ni guiones al inicio o al final.'
	}

	return null
}

export function usePublicSlug({
	kind,
	name,
	initialSlug = '',
	id,
	enabled = true,
}: {
	kind: SlugKind
	name: string
	initialSlug?: string
	id?: string
	enabled?: boolean
}) {
	const [slug, setSlug] = useState(initialSlug)
	const [manual, setManual] = useState(Boolean(initialSlug))
	const [suggesting, setSuggesting] = useState(false)
	const [status, setStatus] = useState<'checking' | 'available' | 'error'>(
		'checking',
	)
	const [error, setError] = useState<string | null>(null)
	const method =
		kind === 'store' ? OpSuggestStoreSlug : OpSuggestOrganizationSlug

	// biome-ignore lint/correctness/useExhaustiveDependencies: al cambiar de tienda o reabrir el diálogo se restaura el slug inicial.
	useEffect(() => {
		setSlug(initialSlug)
		setManual(Boolean(initialSlug))
	}, [initialSlug, id, enabled])

	useEffect(() => {
		if (!enabled || manual || !name.trim()) {
			setSuggesting(false)
			return
		}

		const controller = new AbortController()
		setSuggesting(true)
		const timer = window.setTimeout(() => {
			void rpc<{ slug: string }>(
				method,
				{ data: { name } },
				controller.signal,
			)
				.then((result) => {
					if (!controller.signal.aborted) {
						setSlug(result.slug)
						setSuggesting(false)
					}
				})
				.catch((cause) => {
					if (!controller.signal.aborted) {
						setStatus('error')
						setSuggesting(false)
						setError(
							cause instanceof Error
								? cause.message
								: 'No se pudo sugerir un identificador.',
						)
					}
				})
		}, 300)

		return () => {
			window.clearTimeout(timer)
			controller.abort()
		}
	}, [enabled, manual, name, method])

	const check = useCallback(
		async (signal?: AbortSignal) => {
			const validation = validatePublicSlug(slug, kind)
			if (validation) {
				setStatus('error')
				setError(validation)
				return false
			}

			setStatus('checking')
			setError(null)

			try {
				const result = await rpc<{ available: boolean }>(
					method,
					{ id, data: { slug } },
					signal,
				)
				signal?.throwIfAborted()
				setStatus(result.available ? 'available' : 'error')
				setError(
					result.available
						? null
						: 'Ese identificador ya está en uso. Elige otro.',
				)
				return result.available
			} catch (cause) {
				if (!signal?.aborted) {
					setStatus('error')
					setError(
						cause instanceof Error
							? cause.message
							: 'No se pudo comprobar el identificador.',
					)
				}
				return false
			}
		},
		[slug, kind, method, id],
	)

	useEffect(() => {
		if (!enabled || !slug) {
			setError(null)
			return
		}
		const controller = new AbortController()
		setStatus('checking')
		setError(null)
		const timer = window.setTimeout(() => {
			void check(controller.signal)
		}, 350)

		return () => {
			window.clearTimeout(timer)
			controller.abort()
		}
	}, [enabled, slug, check])

	return {
		slug,
		status: suggesting ? ('checking' as const) : status,
		error,
		check,
		setSlug: (value: string | null) => {
			setManual(true)
			setSlug((value ?? '').toLowerCase())
		},
	}
}
