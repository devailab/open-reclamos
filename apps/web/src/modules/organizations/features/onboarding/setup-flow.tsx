import { useCallback, useState, useTransition } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { sileo } from 'sileo'
import { useSession } from '@/shared/auth/session'
import { PageLoading } from '@/shared/components/page-loading'
import { Button } from '@/shared/components/ui/button'
import { navigateSession } from '../../../identity/action-scope'
import {
	getInstallationStatus,
	getSessionDestination,
	listOrganizations,
} from '../../../identity/api'
import { useActionScope } from '../../../identity/hooks/use-action-scope'
import { useAuthQuery } from '../../../identity/hooks/use-auth-query'
import {
	canCreateOrganization,
	hasTenantAccess,
	sessionDestination,
} from '../../../identity/policy'
import { errorMessage } from '../../../identity/validation'
import {
	completeSetup,
	getCountries,
	type SetupOrganizationInput,
	type SetupStoreInput,
} from './api'
import { SetupStepOrganization } from './step-organization'
import { SetupStepStore } from './step-store'

export function SetupFlow({ mode }: { mode: 'setup' | 'dashboard' }) {
	const { session, refresh } = useSession()
	const navigate = useNavigate()
	const actions = useActionScope()
	const userId = session?.user.id

	const data = useAuthQuery(
		useCallback(
			async (signal: AbortSignal) => {
				if (!userId) {
					return null
				}

				const [status, organizations, countries] = await Promise.all([
					getInstallationStatus(signal),
					listOrganizations(signal),
					getCountries(signal),
				])

				return { status, organizations, countries }
			},
			[userId],
		),
	)

	const [step, setStep] = useState<'organization' | 'store'>('organization')

	const [organization, setOrganization] =
		useState<SetupOrganizationInput | null>(null)

	const [isPending, startTransition] = useTransition()

	const [confirmStore, setConfirmStore] = useState<SetupStoreInput | null>(
		null,
	)

	if (!session) {
		return <Navigate to='/login' replace />
	}

	if (mode === 'setup' && hasTenantAccess(session)) {
		return <Navigate to='/dashboard' replace />
	}

	if (data.loading) {
		return <PageLoading />
	}

	if (data.error) {
		return (
			<div role='alert'>
				{data.error}
				<Button onClick={data.retry}>Reintentar</Button>
			</div>
		)
	}

	if (!data.data) {
		return null
	}

	if (mode === 'setup') {
		const destination = sessionDestination(
			session,
			data.data.status,
			data.data.organizations,
		)

		if (destination !== '/setup') {
			return <Navigate to={destination} replace />
		}
	}

	if (
		!canCreateOrganization(
			session,
			data.data.status.public_registration,
			data.data.organizations,
		)
	) {
		return (
			<div className='space-y-4'>
				<h1 className='text-xl font-semibold'>
					Creación de empresas no disponible
				</h1>
				<p className='text-sm text-muted-foreground'>
					{session.auth_method !== 'local'
						? 'Inicia sesión con tus credenciales locales para crear una empresa.'
						: 'El registro está cerrado. Solo un administrador de una empresa activa o de la plataforma puede crear empresas. Solicita un enlace de invitación para unirte a un equipo.'}
				</p>
				<Link to='/dashboard/account' className='text-primary'>
					Mi cuenta
				</Link>
				<Link to='/login?local=1' className='block text-primary'>
					Iniciar sesión
				</Link>
			</div>
		)
	}

	return (
		<div className='max-w-3xl space-y-8'>
			<div>
				<h1 className='text-xl font-semibold tracking-tight'>
					{mode === 'dashboard'
						? 'Crea una nueva organización'
						: 'Configura tu cuenta'}
				</h1>
				<p className='text-sm text-muted-foreground'>
					Completa los pasos para empezar a usar el libro de
					reclamaciones.
				</p>
			</div>
			<fieldset
				className='flex items-center gap-3 rounded-xl border bg-background px-4 py-3'
				aria-label='Progreso de configuración'
			>
				<span
					className={
						step === 'organization'
							? 'font-medium'
							: 'text-muted-foreground'
					}
				>
					1. Organización
				</span>
				<span className='h-px w-8 bg-border' />
				<span
					className={
						step === 'store'
							? 'font-medium'
							: 'text-muted-foreground'
					}
				>
					2. Primera tienda
				</span>
			</fieldset>
			<div hidden={step !== 'organization'}>
				<SetupStepOrganization
					countries={data.data.countries}
					onNext={(values) => {
						setOrganization(values)
						setConfirmStore(null)
						setStep('store')
					}}
				/>
			</div>
			<div hidden={step !== 'store' || confirmStore !== null}>
				<SetupStepStore
					organizationName={organization?.name}
					onBack={() => {
						setConfirmStore(null)
						setStep('organization')
					}}
					isPending={isPending}
					onSubmit={setConfirmStore}
				/>
			</div>
			{confirmStore && organization ? (
				<div className='space-y-3 rounded-lg border bg-muted/50 p-4'>
					<h2 className='font-medium'>¿Completar el registro?</h2>
					<p className='text-sm'>
						Se registrará «{organization.name}» con RUC{' '}
						{organization.ruc} y la tienda «{confirmStore.name}».
						Una vez creada no podrás modificar el RUC.
					</p>
					<div className='flex gap-2'>
						<Button
							disabled={isPending}
							onClick={() =>
								startTransition(async () => {
									const signal = actions.begin()

									try {
										await completeSetup(
											organization,
											confirmStore,
											mode,
											signal,
										)

										const destination =
											await getSessionDestination(signal)

										signal.throwIfAborted()

										sileo.success({
											title: 'Empresa y tienda registradas',
										})

										navigateSession(
											destination,
											signal,
											navigate,
											refresh,
										)
									} catch (error) {
										if (signal.aborted) {
											return
										}

										sileo.error({
											title: 'Error al completar el registro',
											description: errorMessage(error),
										})
									}
								})
							}
						>
							{isPending
								? 'Guardando...'
								: 'Sí, completar registro'}
						</Button>
						<Button
							variant='outline'
							disabled={isPending}
							onClick={() => setConfirmStore(null)}
						>
							Revisar datos
						</Button>
					</div>
				</div>
			) : null}
		</div>
	)
}
