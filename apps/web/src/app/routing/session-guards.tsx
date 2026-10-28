import { type PropsWithChildren, useEffect, useRef } from 'react'
import {
	Link,
	Navigate,
	Outlet,
	useLocation,
	useNavigate,
	useSearchParams,
} from 'react-router'
import { useSession } from '@/shared/auth/session'
import { ErrorPage, LoadingPage } from './route-feedback'
import { loginPath, safeReturnTo } from './routing-policy'

const RETURN_TO_KEY = 'open-reclamos:returnTo'

function saveReturnTo(value: string) {
	try {
		sessionStorage.setItem(RETURN_TO_KEY, value)
	} catch {
		// El acceso funciona también cuando el navegador bloquea storage.
	}
}

export function SessionReady({ children }: PropsWithChildren) {
	const { loading, error, refresh } = useSession()

	if (loading) {
		return <LoadingPage />
	}
	if (error) {
		return <ErrorPage error={error} retry={() => void refresh()} />
	}
	return children
}

export function RequireSession() {
	const { session, loading, error, refresh } = useSession()
	const location = useLocation()

	const returnTo = safeReturnTo(
		`${location.pathname}${location.search}${location.hash}`,
	)

	useEffect(() => {
		if (!loading && !error && !session && returnTo) {
			saveReturnTo(returnTo)
		}
	}, [loading, error, session, returnTo])

	if (loading) {
		return <LoadingPage />
	}
	if (error) {
		return <ErrorPage error={error} retry={() => void refresh()} />
	}

	if (!session) {
		return <Navigate to={loginPath(returnTo ?? '/dashboard')} replace />
	}

	return <Outlet />
}

export function RequireOrganization() {
	const { session, tenantError, refresh } = useSession()

	if (tenantError) {
		return (
			<div className='space-y-3'>
				<ErrorPage error={tenantError} retry={() => void refresh()} />
				<p>
					El acceso a la empresa fue rechazado. Si tu grant SSO
					venció, vuelve a iniciar sesión desde el selector de
					organizaciones.
				</p>
				<Link to='/dashboard/account' className='text-primary'>
					Mi cuenta y vinculación SSO
				</Link>
			</div>
		)
	}

	if (!session?.organization_id) {
		return <Navigate to='/setup' replace />
	}
	return <Outlet />
}

export function RequirePlatformAdmin() {
	const { session } = useSession()

	if (!session?.user.is_platform_admin || session.auth_method !== 'local') {
		return (
			<div role='alert'>
				No tienes acceso a la administración de la plataforma.
			</div>
		)
	}

	return <Outlet />
}

export function LoginReturnTo({ children }: PropsWithChildren) {
	const [params] = useSearchParams()
	const returnTo = safeReturnTo(params.get('returnTo'))

	useEffect(() => {
		if (returnTo) {
			saveReturnTo(returnTo)
		}
	}, [returnTo])

	return children
}

export function RestoreReturnTo() {
	const { session, loading, error, tenantError } = useSession()
	const location = useLocation()
	const navigate = useNavigate()
	const restored = useRef(false)

	useEffect(() => {
		if (!session && !loading && !error) {
			restored.current = false
		}

		if (
			loading ||
			error ||
			tenantError ||
			!session ||
			location.pathname !== '/dashboard' ||
			restored.current
		) {
			return
		}

		try {
			const returnTo = safeReturnTo(sessionStorage.getItem(RETURN_TO_KEY))

			sessionStorage.removeItem(RETURN_TO_KEY)
			restored.current = true

			if (returnTo && returnTo !== '/dashboard') {
				navigate(returnTo, { replace: true })
			}
		} catch {
			// No se bloquea el dashboard si storage no está disponible.
		}
	}, [session, loading, error, tenantError, location.pathname, navigate])

	return null
}
