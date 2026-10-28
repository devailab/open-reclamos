import { useTransition } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { sileo } from 'sileo'
import { useSession } from '@/shared/auth/session'
import { Button } from '@/shared/components/ui/button'
import { navigateSession } from '../../action-scope'
import { useActionScope } from '../../hooks/use-action-scope'
import { hasTenantAccess } from '../../policy'
import { errorMessage } from '../../validation'
import { logout } from './api'
import { ApiKeySection } from './api-key-section'
import { ChangePasswordForm } from './change-password-form'
import { ProfileForm } from './profile-form'
import { SsoLinks } from './sso-links'

export function AccountPage() {
	const { session, tenantError, refresh } = useSession()
	const actions = useActionScope()
	const navigate = useNavigate()
	const [isPending, startTransition] = useTransition()

	if (!session) {
		return <Navigate to='/login' replace />
	}

	const local = session.auth_method === 'local'

	return (
		<div className='space-y-6'>
			<div>
				<h1 className='text-2xl font-semibold'>Mi cuenta</h1>
				<p className='mt-1 text-sm text-muted-foreground'>
					Administra tu perfil y preferencias de cuenta.
				</p>
			</div>
			<div className='max-w-3xl space-y-6'>
				<ProfileForm key={session.user.id} user={session.user} />
				<ChangePasswordForm />
				<SsoLinks
					key={session.user.id}
					userId={session.user.id}
					local={local}
				/>
				{tenantError ? (
					<p role='alert' className='text-sm text-destructive'>
						El acceso a la empresa activa debe renovarse. Usa
						«Acceder» en su conexión SSO o confirma tus credenciales
						locales.
					</p>
				) : null}
				<ApiKeySection
					key={`${session.user.id}:${session.organization_id}`}
					organizationId={
						hasTenantAccess(session) && !tenantError
							? session.organization_id
							: ''
					}
				/>
				<Button
					variant='outline'
					disabled={isPending}
					onClick={() =>
						startTransition(async () => {
							const signal = actions.begin()

							try {
								await logout(signal)

								navigateSession(
									'/login',
									signal,
									navigate,
									refresh,
								)
							} catch (error) {
								if (signal.aborted) {
									return
								}

								sileo.error({
									title: 'No se pudo cerrar sesión',
									description: errorMessage(error),
								})
							}
						})
					}
				>
					{isPending ? 'Cerrando sesión...' : 'Cerrar sesión'}
				</Button>
			</div>
		</div>
	)
}
