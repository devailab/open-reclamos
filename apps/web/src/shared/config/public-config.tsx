import {
	createContext,
	type PropsWithChildren,
	use,
	useEffect,
	useState,
} from 'react'

const PublicConfigContext = createContext<PublicConfig | null>(null)

function asError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error))
}

export interface PublicConfig {
	appName: string
	documentLookupEnabled: boolean
}

export function PublicConfigProvider({ children }: PropsWithChildren) {
	const [config, setConfig] = useState<PublicConfig | null>(null)
	const [configError, setConfigError] = useState<Error | null>(null)
	const [configAttempt, setConfigAttempt] = useState(0)
	// biome-ignore lint/correctness/useExhaustiveDependencies: configAttempt fuerza una nueva solicitud al reintentar, aunque no forme parte del payload.
	useEffect(() => {
		const controller = new AbortController()

		setConfigError(null)

		fetch('/api/config', {
			credentials: 'same-origin',
			signal: controller.signal,
		})
			.then(async (response) => {
				if (!response.ok) {
					throw new Error(
						'No se pudo cargar la configuración de la aplicación.',
					)
				}

				const data: unknown = await response.json()

				if (
					!data ||
					typeof data !== 'object' ||
					!('appName' in data) ||
					typeof data.appName !== 'string'
				) {
					throw new Error(
						'La configuración de la aplicación no es válida.',
					)
				}

				if (!controller.signal.aborted) {
					setConfig({
						appName: data.appName,
						documentLookupEnabled:
							'documentLookupEnabled' in data &&
							data.documentLookupEnabled === true,
					})
				}
			})
			.catch((cause) => {
				if (!controller.signal.aborted) {
					setConfigError(asError(cause))
				}
			})

		return () => controller.abort()
	}, [configAttempt])

	useEffect(() => {
		if (config) {
			document.title = config.appName
		}
	}, [config])

	return (
		<PublicConfigContext value={config}>
			{configError ? (
				<div role='alert' className='p-4'>
					<p>{configError.message}</p>
					<button
						type='button'
						onClick={() =>
							setConfigAttempt((attempt) => attempt + 1)
						}
					>
						Reintentar configuración
					</button>
				</div>
			) : null}
			{children}
		</PublicConfigContext>
	)
}

export function usePublicConfig(): PublicConfig | null {
	return use(PublicConfigContext)
}
