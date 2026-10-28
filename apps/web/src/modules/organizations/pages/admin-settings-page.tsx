import { PermissionAdmin } from '@open-reclamos/rpc-client'
import { Navigate } from 'react-router'
import { useSession } from '@/shared/auth/session'
import { EmailTestCard } from '../../integrations/features/email/email-test-card'

export function AdminSettingsPage() {
	const { session } = useSession()

	if (!session) {
		return <Navigate to='/login' replace />
	}

	if (!session.user.is_platform_admin || session.auth_method !== 'local') {
		return <Navigate to='/dashboard' replace />
	}

	return (
		<div className='space-y-6'>
			<div>
				<h1 className='text-2xl font-semibold'>Admin Plataforma</h1>
				<p className='mt-1 text-sm text-muted-foreground'>
					Configuración interna de la plataforma. Solo accesible para
					el administrador de plataforma con acceso local.
				</p>
			</div>
			<EmailTestCard
				defaultRecipientEmail={session.user.email}
				canManage={
					session.capabilities?.[PermissionAdmin] === true &&
					Boolean(session.organization_id)
				}
			/>
		</div>
	)
}
