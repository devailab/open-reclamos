import {
	createContext,
	type PropsWithChildren,
	use,
	useEffect,
	useSyncExternalStore,
} from 'react'
import { type SessionSnapshot, sessionStore } from './session-store'

export {
	isUnauthenticated,
	loadSession,
	type Organization,
	type Session,
} from './session-service'

type SessionContextValue = SessionSnapshot & { refresh: () => Promise<void> }

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: PropsWithChildren) {
	const snapshot = useSyncExternalStore(
		sessionStore.subscribe,
		sessionStore.getSnapshot,
		sessionStore.getSnapshot,
	)

	useEffect(() => {
		void sessionStore.ensure()

		const expired = () => sessionStore.clear()

		window.addEventListener('open-reclamos-auth-expired', expired)

		return () =>
			window.removeEventListener('open-reclamos-auth-expired', expired)
	}, [])

	return (
		<SessionContext value={{ ...snapshot, refresh: sessionStore.refresh }}>
			{children}
		</SessionContext>
	)
}

export function useSession(): SessionContextValue {
	const context = use(SessionContext)

	if (!context) {
		throw new Error('useSession requiere SessionProvider')
	}
	return context
}
