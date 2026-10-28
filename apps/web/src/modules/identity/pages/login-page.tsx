import { useCallback } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router'
import { useSession } from '@/shared/auth/session'
import { PageLoading } from '@/shared/components/page-loading'
import { Button } from '@/shared/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/shared/components/ui/card'
import { usePublicConfig } from '@/shared/config/public-config'
import { getInstallationStatus, getLoginOptions, ssoStartURL } from '../api'
import { LoginForm } from '../components/login-form'
import { SSOLoginDialog } from '../components/sso-login-dialog'
import { useAuthQuery } from '../hooks/use-auth-query'
import { shouldRedirectLogin } from '../policy'

export function LoginPage() {
	const { organizationSlug } = useParams<{ organizationSlug: string }>()
	const { session, tenantError } = useSession()
	const [params] = useSearchParams()
	const forceLocal = params.get('local') === '1'
	const config = usePublicConfig()
	const status = useAuthQuery(getInstallationStatus)

	const options = useAuthQuery(
		useCallback(
			(signal: AbortSignal) =>
				organizationSlug
					? getLoginOptions(organizationSlug, signal)
					: Promise.resolve(null),
			[organizationSlug],
		),
	)

	if (
		shouldRedirectLogin(session, organizationSlug, forceLocal, tenantError)
	) {
		return <Navigate to='/dashboard' replace />
	}

	if (status.loading || options.loading) {
		return <PageLoading />
	}

	if (status.error || options.error) {
		return (
			<div role='alert'>
				<p>{status.error ?? options.error}</p>
				<Button
					onClick={() => {
						status.retry()
						options.retry()
					}}
				>
					Reintentar
				</Button>
				<Link to='/login'>Acceso general</Link>
			</div>
		)
	}

	if (!status.data?.installed) {
		return <Navigate to='/install' replace />
	}

	return (
		<div className='space-y-6'>
			{options.data ? (
				<Card>
					<CardHeader>
						<CardTitle>{options.data.organization.name}</CardTitle>
						<CardDescription>
							Accede al libro de reclamaciones de tu empresa.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-3'>
						{options.data.sso ? (
							<Button
								className='w-full'
								onClick={() => {
									if (options.data) {
										window.location.assign(
											ssoStartURL(options.data, 'login'),
										)
									}
								}}
							>
								Continuar con {options.data.sso.name}
							</Button>
						) : null}
						{options.data.login_mode === 'sso_required' ? (
							<p className='text-sm text-muted-foreground'>
								Esta empresa requiere acceso mediante su
								proveedor de identidad. Si aceptaste una
								invitación, vincula tu identidad desde Mi cuenta
								antes de continuar.
							</p>
						) : null}
					</CardContent>
				</Card>
			) : (
				<p className='text-sm text-muted-foreground'>
					{config?.appName ?? 'Open Reclamos'}
				</p>
			)}
			{forceLocal || options.data?.login_mode !== 'sso_required' ? (
				<>
					<LoginForm
						key={`${organizationSlug ?? ''}:${forceLocal}`}
						showRegisterLink={
							!forceLocal && status.data.public_registration
						}
						organizationSlug={organizationSlug}
					/>
					{forceLocal ? (
						<p className='text-sm text-muted-foreground'>
							Confirma tu correo y contraseña local. La sesión
							existente no autoriza el acceso a otra empresa.
						</p>
					) : null}
				</>
			) : null}
			{!organizationSlug && !forceLocal && <SSOLoginDialog />}
			{session ? (
				<Link
					to='/dashboard/account'
					className='block text-sm text-primary hover:underline'
				>
					Mi cuenta y vinculación SSO
				</Link>
			) : null}
		</div>
	)
}
