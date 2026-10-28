import { useCallback, useEffect, useRef } from 'react'

export function useRequestSignal() {
	const controllerRef = useRef<AbortController | null>(null)

	if (!controllerRef.current) {
		controllerRef.current = new AbortController()
	}

	useEffect(() => {
		const controller = new AbortController()

		controllerRef.current = controller

		return () => controller.abort()
	}, [])

	return useCallback(() => {
		if (!controllerRef.current) {
			throw new Error('La solicitud no está disponible.')
		}

		return controllerRef.current.signal
	}, [])
}
