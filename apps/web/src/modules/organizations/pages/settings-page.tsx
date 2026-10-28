import { PermissionAdmin } from '@open-reclamos/rpc-client'
import { useEffect, useState } from 'react'
import { useSession } from '@/shared/auth/session'
import { PageLoading } from '@/shared/components/page-loading'
import { Button } from '@/shared/components/ui/button'
import { loadSettings } from '../features/settings/api'
import { OrganizationSettingsForm } from '../features/settings/organization-settings-form'
import type { OrganizationSettings } from '../features/settings/types'

export function SettingsPage() {
	const { session } = useSession()

	if (!session?.organization_id) {
		return <p role='status'>Selecciona una organización para continuar.</p>
	}

	return <SettingsPageContent key={session.organization_id} />
}

function SettingsPageContent() {
	const { session } = useSession()
	const canManage = session?.capabilities?.[PermissionAdmin] === true
	const [org, setOrg] = useState<OrganizationSettings | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [attempt, setAttempt] = useState(0)
	// biome-ignore lint/correctness/useExhaustiveDependencies: El contador permite reintentar la carga de configuración.
	useEffect(() => {
		const controller = new AbortController()

		setOrg(null)
		setError(null)

		loadSettings(controller.signal)
			.then((result) => {
				if (!controller.signal.aborted) {
					setOrg(result)
				}
			})
			.catch((error) => {
				if (!controller.signal.aborted) {
					setError(
						error instanceof Error
							? error.message
							: 'No se pudo cargar la configuración.',
					)
				}
			})

		return () => controller.abort()
	}, [attempt])

	return (
		<div className='space-y-6'>
			<div>
				<h1 className='text-2xl font-semibold'>Configuración</h1>
				<p className='mt-1 text-sm text-muted-foreground'>
					Administra la información general de tu empresa.
				</p>
			</div>
			{error ? (
				<div role='alert'>
					{error}
					<Button
						variant='outline'
						onClick={() => setAttempt((value) => value + 1)}
					>
						Reintentar
					</Button>
				</div>
			) : org ? (
				<OrganizationSettingsForm
					key={org.id}
					org={org}
					currentUbigeoOption={{
						value: org.ubigeoId,
						label: 'Distrito actual (sin cambios)',
					}}
					canManage={canManage}
					onSaved={() => setAttempt((value) => value + 1)}
				/>
			) : (
				<PageLoading />
			)}
		</div>
	)
}
