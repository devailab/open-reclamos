import { PermissionAdmin } from '@open-reclamos/rpc-client'
import { useSession } from '@/shared/auth/session'
import { SSOSettings } from '../features/settings/sso-settings'

export function SSOPage() {
	const { session } = useSession()

	if (!session?.organization_id) {
		return <p role='status'>Selecciona una organización para continuar.</p>
	}

	if (session.capabilities?.[PermissionAdmin] !== true) {
		return <p role='alert'>No tienes acceso a la configuración SSO.</p>
	}

	return (
		<div className='space-y-6'>
			<div>
				<h1 className='text-2xl font-semibold'>SSO</h1>
				<p className='mt-1 text-sm text-muted-foreground'>
					Administra las conexiones y la política de inicio de sesión
					de tu organización.
				</p>
			</div>
			<SSOSettings key={session.organization_id} />
		</div>
	)
}
