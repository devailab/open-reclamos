import {
	OpGetSSOMetadata,
	OpSaveSSOConnection,
	OpUpdateSSOPolicy,
} from '@open-reclamos/rpc-client'
import {
	Check,
	ChevronRight,
	ExternalLink,
	Plus,
	RefreshCw,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { Link as RouterLink } from 'react-router'
import { sileo } from 'sileo'
import { downloadRPC, rpc } from '@/shared/api/rpc'
import { useSession } from '@/shared/auth/session'
import { CopyButton } from '@/shared/components/copy-button'
import SelectField, {
	type SelectOption,
} from '@/shared/components/forms/select-field'
import TextField from '@/shared/components/forms/text-field'
import TextAreaField from '@/shared/components/forms/textarea-field'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { useForm } from '@/shared/hooks/use-form'
import { cn } from '@/shared/lib/utils'
import { required } from '@/shared/lib/validators'
import { startAuthenticatedSSO } from '../../../identity/api'
import { loadSSOSettings } from './api'
import type { SSOConnection, SSOPolicy } from './types'
import { useRequestSignal } from './use-request-signal'

const PROTOCOL_OPTIONS = [
	{ value: 'oidc', label: 'OpenID Connect (OIDC)' },
	{ value: 'saml', label: 'SAML 2.0' },
]

const MODE_OPTIONS = [
	{ value: 'local', label: 'Acceso local' },
	{ value: 'mixed', label: 'Local y SSO' },
	{ value: 'sso_required', label: 'SSO obligatorio' },
]

interface Values {
	name: string | null
	protocol: SelectOption | null
	issuer: string | null
	clientId: string | null
	clientSecret: string | null
	metadata: string | null
	subjectAttribute: string | null
}

const INITIAL_VALUES: Values = {
	name: null,
	protocol: PROTOCOL_OPTIONS[0],
	issuer: null,
	clientId: null,
	clientSecret: null,
	metadata: null,
	subjectAttribute: null,
}

const STEPS = [
	{ id: 1, title: 'Conexión', description: 'Configura tu proveedor' },
	{ id: 2, title: 'URLs y prueba', description: 'Conecta ambos servicios' },
	{ id: 3, title: 'Acceso', description: 'Elige cómo iniciar sesión' },
] as const

function connectionStatus(connection: SSOConnection, policy: SSOPolicy | null) {
	if (
		connection.id === policy?.active_connection_id &&
		policy.login_mode !== 'local'
	) {
		return 'En uso'
	}

	return connection.tested_version === connection.config_version
		? 'Probada'
		: 'Sin probar'
}

export function SSOSettings() {
	const { session, refresh } = useSession()
	const loginPath = session?.organization?.slug
		? `/login/${encodeURIComponent(session.organization.slug)}`
		: null
	const loginUrl = loginPath
		? new URL(loginPath, window.location.origin).href
		: null
	const getSignal = useRequestSignal()
	const requestRef = useRef(0)
	const [values, setValues] = useState<Values>(INITIAL_VALUES)

	const { register, validate, reset } = useForm({
		values,
		setValues,
		initialValues: INITIAL_VALUES,
	})

	const [connections, setConnections] = useState<SSOConnection[]>([])
	const [policy, setPolicy] = useState<SSOPolicy | null>(null)
	const [mode, setMode] = useState<SelectOption | null>(null)
	const [selected, setSelected] = useState<SelectOption | null>(null)
	const [editing, setEditing] = useState<SSOConnection | null>(null)
	// undefined elige la conexión inicial; null abre una nueva.
	const [focusedID, setFocusedID] = useState<string | null>()
	const [step, setStep] = useState<1 | 2 | 3>(1)
	const [callback, setCallback] = useState<{
		connectionID: string
		url: string
	} | null>(null)
	const [callbackError, setCallbackError] = useState<string | null>(null)
	const [callbackAttempt, setCallbackAttempt] = useState(0)
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)
	const [pending, startTransition] = useTransition()

	const load = useCallback(
		async (signal = getSignal()) => {
			const request = ++requestRef.current

			setLoading(true)

			try {
				const { connections: nextConnections, policy: nextPolicy } =
					await loadSSOSettings(signal)

				if (signal.aborted || request !== requestRef.current) {
					return
				}

				setConnections(nextConnections)
				setPolicy(nextPolicy)

				setMode(
					MODE_OPTIONS.find(
						(option) => option.value === nextPolicy.login_mode,
					) ?? null,
				)

				const active = nextConnections.find(
					(connection) =>
						connection.id === nextPolicy.active_connection_id,
				)

				setSelected(
					active ? { value: active.id, label: active.name } : null,
				)

				setError(null)
			} catch (error) {
				if (!signal.aborted && request === requestRef.current) {
					setError(
						error instanceof Error
							? error.message
							: 'No se pudo cargar SSO.',
					)
				}
			} finally {
				if (!signal.aborted && request === requestRef.current) {
					setLoading(false)
				}
			}
		},
		[getSignal],
	)

	useEffect(() => {
		const controller = new AbortController()

		void load(controller.signal)

		return () => controller.abort()
	}, [load])

	const run = (action: (signal: AbortSignal) => Promise<void>) => {
		const signal = getSignal()

		startTransition(async () => {
			try {
				signal.throwIfAborted()
				await action(signal)
			} catch (error) {
				if (signal.aborted) {
					return
				}

				sileo.error({
					title: 'Error en configuración SSO',
					description:
						error instanceof Error
							? error.message
							: 'Inténtalo nuevamente.',
				})
			}
		})
	}

	const save = () => {
		if (validate().length) {
			return
		}

		run(async (signal) => {
			const result = await rpc<{ id: string; test_url: string }>(
				OpSaveSSOConnection,
				{
					id: editing?.id,
					data: {
						name: values.name?.trim(),
						protocol: values.protocol?.value,
						issuer_url: values.issuer?.trim(),
						client_id: values.clientId?.trim(),
						client_secret: values.clientSecret,
						idp_metadata_xml: values.metadata,
						subject_attribute: values.subjectAttribute,
					},
				},
				signal,
			)

			signal.throwIfAborted()
			setFocusedID(result.id)
			setStep(2)
			setEditing(null)
			reset()
			setCallback(null)
			setCallbackAttempt((value) => value + 1)
			await load(signal)
			signal.throwIfAborted()

			sileo.success({
				title: 'Conexión guardada',
				description:
					'Configura las URLs en tu proveedor y prueba la conexión.',
			})
		})
	}

	const applyPolicy = () =>
		run(async (signal) => {
			await rpc(
				OpUpdateSSOPolicy,
				{
					data: {
						login_mode: mode?.value,
						connection_id:
							mode?.value === 'local' ? null : selected?.value,
					},
				},
				signal,
			)

			signal.throwIfAborted()
			await Promise.all([load(signal), refresh()])
			signal.throwIfAborted()
			sileo.success({ title: 'Política de acceso actualizada' })
		})

	const oidc = values.protocol?.value === 'oidc'

	const candidate = connections.find(
		(connection) => connection.id === selected?.value,
	)

	const canActivate =
		mode?.value === 'local' ||
		Boolean(
			candidate && candidate.tested_version === candidate.config_version,
		)

	const focused = connections.find((connection) =>
		focusedID === undefined
			? connection.id ===
				(policy?.active_connection_id ?? connections[0]?.id)
			: connection.id === focusedID,
	)
	const connectionID = focused?.id
	const protocol = focused?.protocol
	const isEditing = Boolean(editing)
	const isTested = Boolean(
		focused && focused.tested_version === focused.config_version,
	)
	const isActive =
		focused?.id === policy?.active_connection_id &&
		policy?.login_mode !== 'local'
	const callbackUrl =
		callback && callback.connectionID === connectionID ? callback.url : null
	const postLogoutUrl = callbackUrl
		? new URL('/login', callbackUrl).href
		: null

	// la URL viene del backend para usar el mismo dominio que el proveedor.
	// biome-ignore lint/correctness/useExhaustiveDependencies: callbackAttempt permite reintentar la carga de URLs.
	useEffect(() => {
		setCallbackError(null)

		if (!connectionID || protocol !== 'oidc') {
			return
		}

		const controller = new AbortController()

		rpc<{ callback_url: string }>(
			OpGetSSOMetadata,
			{ id: connectionID },
			controller.signal,
		)
			.then((result) => {
				if (!controller.signal.aborted) {
					setCallback({ connectionID, url: result.callback_url })
				}
			})
			.catch((error) => {
				if (!controller.signal.aborted) {
					setCallbackError(
						error instanceof Error
							? error.message
							: 'No se pudieron cargar las URLs.',
					)
				}
			})

		return () => controller.abort()
	}, [connectionID, protocol, callbackAttempt])

	const newConnection = () => {
		reset()
		setEditing(null)
		setFocusedID(null)
		setStep(1)
	}

	const chooseConnection = (connection: SSOConnection) => {
		reset()
		setEditing(null)
		setFocusedID(connection.id)
		setStep(2)
	}

	const editConnection = () => {
		if (!focused || isActive) {
			return
		}

		reset()
		setEditing(focused)
		setValues({
			...INITIAL_VALUES,
			name: focused.name,
			protocol:
				PROTOCOL_OPTIONS.find(
					(option) => option.value === focused.protocol,
				) ?? null,
		})
	}

	return (
		<div className='grid min-w-0 gap-8 lg:grid-cols-[250px_minmax(0,1fr)]'>
			<aside className='space-y-5 lg:border-r lg:pr-6'>
				<div className='flex items-center justify-between'>
					<h2 className='text-sm font-semibold'>Conexiones</h2>
					<Button
						variant='ghost'
						size='icon-sm'
						title='Actualizar conexiones'
						disabled={pending || loading}
						onClick={() => void load()}
					>
						<RefreshCw className={cn(loading && 'animate-spin')} />
						<span className='sr-only'>Actualizar conexiones</span>
					</Button>
				</div>
				<div className='space-y-1'>
					{connections.map((connection) => (
						<button
							key={connection.id}
							type='button'
							disabled={pending}
							aria-pressed={focused?.id === connection.id}
							onClick={() => chooseConnection(connection)}
							className={cn(
								'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50',
								focused?.id === connection.id && 'bg-muted',
							)}
						>
							<span className='min-w-0'>
								<span className='block truncate text-sm font-medium'>
									{connection.name}
								</span>
								<span className='text-xs text-muted-foreground'>
									{connection.protocol.toUpperCase()} ·{' '}
									{connectionStatus(connection, policy)}
								</span>
							</span>
							<ChevronRight className='size-4 shrink-0 text-muted-foreground' />
						</button>
					))}
					{!loading && !connections.length && (
						<p className='py-2 text-sm text-muted-foreground'>
							Aún no tienes conexiones. Crea la primera para
							empezar.
						</p>
					)}
				</div>
				<Button
					variant='outline'
					className='w-full'
					disabled={pending || loading}
					onClick={newConnection}
				>
					<Plus /> Nueva conexión
				</Button>
				<div className='border-t pt-4 text-xs text-muted-foreground'>
					<p className='font-medium text-foreground'>Acceso actual</p>
					<p className='mt-1'>
						{MODE_OPTIONS.find(
							(option) => option.value === policy?.login_mode,
						)?.label ?? 'Cargando...'}
					</p>
					<p className='mt-2'>
						Guardar una conexión registra su configuración. El modo
						de acceso se aplica en el paso 3.
					</p>
				</div>
			</aside>

			<div className='min-w-0 space-y-7'>
				{session?.organization?.business_domain ? (
					<div className='flex flex-wrap items-center justify-between gap-3 border-b pb-5'>
						<div>
							<p className='text-sm font-medium'>
								Dominio empresarial
							</p>
							<p className='mt-1 text-xs text-muted-foreground'>
								Tus usuarios pueden ingresarlo en «Ingresar con
								SSO» desde el login general.
							</p>
						</div>
						<div className='flex items-center gap-2'>
							<code className='break-all text-sm'>
								{session.organization.business_domain}
							</code>
							<CopyButton
								value={session.organization.business_domain}
							/>
							<RouterLink
								to='/dashboard/settings'
								className='text-sm underline underline-offset-4'
							>
								Editar
							</RouterLink>
						</div>
					</div>
				) : (
					<div
						role='status'
						className='space-y-2 rounded-lg bg-muted/50 px-4 py-3'
					>
						<p className='text-sm font-medium'>
							Facilita el acceso desde el login general
						</p>
						<p className='text-sm text-muted-foreground'>
							Todavía no configuraste un dominio empresarial.
							Agrega uno, como devailab.com o devailab, para que
							tus usuarios encuentren el acceso SSO de tu
							organización.
						</p>
						<RouterLink
							to='/dashboard/settings'
							className='inline-block text-sm font-medium underline underline-offset-4'
						>
							Configurar dominio empresarial
						</RouterLink>
					</div>
				)}
				{loginUrl && (
					<ProviderURL
						label='Enlace de acceso para tus usuarios'
						value={loginUrl}
						description='Comparte este enlace con los miembros de tu organización. Mostrará las opciones de inicio de sesión según la política guardada.'
						openable
					/>
				)}
				{error && (
					<div
						role='alert'
						className='flex flex-wrap items-center gap-3 text-sm text-destructive'
					>
						<p>{error}</p>
						<Button
							variant='outline'
							disabled={loading || pending}
							onClick={() => void load()}
						>
							Reintentar
						</Button>
					</div>
				)}
				<nav
					aria-label='Pasos de configuración SSO'
					className='border-b pb-5'
				>
					<ol className='grid grid-cols-3 gap-2 sm:gap-5'>
						{STEPS.map((item) => (
							<li key={item.id}>
								<button
									type='button'
									aria-current={
										step === item.id ? 'step' : undefined
									}
									disabled={
										pending ||
										loading ||
										(item.id === 2 && !focused) ||
										isEditing
									}
									onClick={() => setStep(item.id)}
									className={cn(
										'flex w-full items-start gap-2 rounded-md text-left focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40 sm:gap-3',
										step !== item.id &&
											'text-muted-foreground',
									)}
								>
									<span
										className={cn(
											'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
											step === item.id &&
												'border-primary bg-primary text-primary-foreground',
										)}
									>
										{(item.id === 1 &&
											focused &&
											!isEditing) ||
										(item.id === 2 && isTested) ? (
											<Check className='size-3.5' />
										) : (
											item.id
										)}
									</span>
									<span>
										<span className='block text-sm font-medium'>
											{item.title}
										</span>
										<span className='mt-0.5 hidden text-xs sm:block'>
											{item.description}
										</span>
									</span>
								</button>
							</li>
						))}
					</ol>
				</nav>

				{loading && !policy ? (
					<p role='status' className='text-sm text-muted-foreground'>
						Cargando configuración SSO...
					</p>
				) : (
					<>
						{step === 1 && (
							<section
								aria-labelledby='sso-connection-title'
								className='max-w-3xl space-y-6'
							>
								<div>
									<h2
										id='sso-connection-title'
										className='text-lg font-semibold'
									>
										{editing
											? `Editar ${editing.name}`
											: focused
												? focused.name
												: 'Configura tu conexión'}
									</h2>
									<p className='mt-1 text-sm text-muted-foreground'>
										{focused && !isEditing
											? 'La configuración de esta conexión ya está guardada.'
											: 'Ingresa los datos de la aplicación que creaste en tu proveedor de identidad.'}
									</p>
								</div>

								{focused && !isEditing ? (
									<div className='space-y-5'>
										<div className='flex flex-wrap gap-2'>
											<Badge variant='secondary'>
												{focused.protocol.toUpperCase()}
											</Badge>
											<Badge variant='outline'>
												{connectionStatus(
													focused,
													policy,
												)}
											</Badge>
										</div>
										<p className='text-sm text-muted-foreground'>
											{isActive
												? 'Esta conexión está en uso. Para reemplazarla, crea y prueba una nueva conexión y después selecciónala en el paso 3.'
												: 'Puedes volver a configurar esta conexión. Tendrás que ingresar todos sus datos y probarla nuevamente. En OIDC, cambiar el Issuer o Client ID requiere una nueva conexión.'}
										</p>
										<div className='flex flex-wrap gap-2'>
											<Button onClick={() => setStep(2)}>
												Ver URLs y probar{' '}
												<ChevronRight />
											</Button>
											{!isActive && (
												<Button
													variant='outline'
													disabled={pending}
													onClick={editConnection}
												>
													Editar configuración
												</Button>
											)}
										</div>
									</div>
								) : (
									<div className='space-y-5'>
										{editing && (
											<p className='text-sm text-muted-foreground'>
												Ingresa nuevamente la
												configuración completa y el
												secreto. Guardar estos cambios
												requiere repetir la prueba de
												conexión.
											</p>
										)}
										<div className='grid gap-4 sm:grid-cols-2'>
											<TextField
												{...register('name')}
												label='Nombre de la conexión'
												placeholder='Ej. Acceso empresarial'
												validate={required}
												disabled={pending}
											/>
											<SelectField
												{...register('protocol')}
												label='Protocolo'
												options={PROTOCOL_OPTIONS}
												validate={required}
												disabled={
													pending || Boolean(editing)
												}
											/>
										</div>
										{oidc ? (
											<>
												<TextField
													{...register('issuer')}
													label='Issuer URL'
													placeholder='https://tu-proveedor.com'
													type='url'
													validate={(value) => {
														if (!value) {
															return 'El issuer es requerido.'
														}

														try {
															const url = new URL(
																value,
															)

															return url.protocol ===
																'https:' &&
																!url.search &&
																!url.hash
																? null
																: 'Usa HTTPS sin query ni fragmento.'
														} catch {
															return 'URL inválida.'
														}
													}}
													disabled={pending}
												/>
												<p className='text-xs text-muted-foreground'>
													Usa la URL del emisor OIDC
													que indica tu proveedor, con
													HTTPS.
												</p>
												<div className='grid gap-4 sm:grid-cols-2'>
													<TextField
														{...register(
															'clientId',
														)}
														label='Client ID'
														validate={required}
														disabled={pending}
													/>
													<TextField
														{...register(
															'clientSecret',
														)}
														label='Client secret'
														type='password'
														validate={required}
														disabled={pending}
													/>
												</div>
												<p className='text-sm text-muted-foreground'>
													Después de guardar, el paso
													2 mostrará el Redirect URI
													para copiarlo en tu
													proveedor.
												</p>
											</>
										) : (
											<>
												<TextAreaField
													{...register('metadata')}
													label='Metadata XML del proveedor (IdP)'
													validate={required}
													disabled={pending}
													rows={8}
												/>
												<TextField
													{...register(
														'subjectAttribute',
													)}
													label='Atributo del identificador de usuario (opcional)'
													disabled={pending}
												/>
												<p className='text-sm text-muted-foreground'>
													Después de guardar podrás
													descargar la metadata de
													Open Reclamos para
													configurarla en el
													proveedor.
												</p>
											</>
										)}
										<div className='flex flex-wrap gap-2 border-t pt-5'>
											<Button
												disabled={pending || loading}
												onClick={save}
											>
												{pending
													? 'Guardando...'
													: 'Guardar'}{' '}
												<ChevronRight />
											</Button>
											{editing && (
												<Button
													variant='outline'
													disabled={pending}
													onClick={() => {
														setEditing(null)
														reset()
													}}
												>
													Cancelar edición
												</Button>
											)}
										</div>
									</div>
								)}
							</section>
						)}

						{step === 2 && focused && (
							<section
								aria-labelledby='sso-test-title'
								className='max-w-4xl space-y-7'
							>
								<div className='flex flex-wrap items-start justify-between gap-3'>
									<div>
										<h2
											id='sso-test-title'
											className='text-lg font-semibold'
										>
											Conecta {focused.name} con Open
											Reclamos
										</h2>
										<p className='mt-1 text-sm text-muted-foreground'>
											Registra las URLs en tu proveedor,
											guarda sus cambios y después prueba
											el acceso.
										</p>
									</div>
									<Badge variant='outline'>
										{connectionStatus(focused, policy)}
									</Badge>
								</div>

								{focused.protocol === 'oidc' ? (
									<div className='space-y-5'>
										{callbackUrl ? (
											<>
												<ProviderURL
													label='Redirect URI / Callback URL'
													value={callbackUrl}
													description='Pégala en las URLs de redirección permitidas de tu aplicación OIDC.'
												/>
												{postLogoutUrl && (
													<ProviderURL
														label='Post Logout URI (opcional)'
														value={postLogoutUrl}
														description='URL de retorno si tu proveedor exige este campo. Open Reclamos cierra su propia sesión; el cierre de sesión del proveedor SSO todavía no está integrado.'
													/>
												)}
											</>
										) : callbackError ? (
											<div
												role='alert'
												className='space-y-2 text-sm'
											>
												<p className='text-destructive'>
													{callbackError}
												</p>
												<Button
													variant='outline'
													disabled={pending}
													onClick={() =>
														setCallbackAttempt(
															(value) =>
																value + 1,
														)
													}
												>
													Reintentar URLs
												</Button>
											</div>
										) : (
											<p
												role='status'
												className='text-sm text-muted-foreground'
											>
												Cargando URLs de la conexión...
											</p>
										)}
									</div>
								) : (
									<div className='space-y-3'>
										<h3 className='text-sm font-medium'>
											Metadata de Open Reclamos (SP)
										</h3>
										<p className='text-sm text-muted-foreground'>
											Descarga el XML e impórtalo en tu
											proveedor SAML. Incluye el Entity ID
											y la URL de respuesta ACS.
										</p>
										<Button
											variant='outline'
											disabled={pending}
											onClick={() =>
												run(async (signal) => {
													await downloadRPC(
														OpGetSSOMetadata,
														{ id: focused.id },
														signal,
													)
												})
											}
										>
											Descargar metadata SP
										</Button>
									</div>
								)}

								<div className='space-y-4 border-t pt-6'>
									<div>
										<h3 className='font-medium'>
											Prueba el inicio de sesión
										</h3>
										<p className='mt-1 text-sm text-muted-foreground'>
											Se abrirá una ventana para
											autenticarte con tu proveedor. La
											prueba también vincula esa identidad
											con tu cuenta actual.
										</p>
									</div>
									<div className='flex flex-wrap gap-2'>
										<Button
											disabled={
												pending ||
												loading ||
												(focused.protocol === 'oidc' &&
													!callbackUrl)
											}
											onClick={() =>
												run((signal) =>
													startAuthenticatedSSO(
														`/auth/sso/${encodeURIComponent(focused.id)}/start?purpose=test`,
														true,
														signal,
													),
												)
											}
										>
											Probar conexión
										</Button>
										<Button
											variant='outline'
											disabled={pending || loading}
											onClick={() => void load()}
										>
											<RefreshCw
												className={cn(
													loading && 'animate-spin',
												)}
											/>{' '}
											Comprobar resultado
										</Button>
									</div>
									<p
										role='status'
										className='text-sm text-muted-foreground'
									>
										{isTested
											? 'Prueba completada. Esta conexión ya puede seleccionarse para el acceso SSO.'
											: 'Al terminar en el proveedor, vuelve aquí y pulsa «Comprobar resultado».'}
									</p>
								</div>
								<div className='flex justify-end border-t pt-5'>
									<Button
										variant={
											isTested ? 'default' : 'outline'
										}
										disabled={pending || loading}
										onClick={() => {
											if (isTested) {
												setSelected({
													value: focused.id,
													label: focused.name,
												})
											}
											setStep(3)
										}}
									>
										Configurar acceso <ChevronRight />
									</Button>
								</div>
							</section>
						)}

						{step === 3 && (
							<section
								aria-labelledby='sso-access-title'
								className='max-w-3xl space-y-6'
							>
								<div>
									<h2
										id='sso-access-title'
										className='text-lg font-semibold'
									>
										Elige cómo acceden tus usuarios
									</h2>
									<p className='mt-1 text-sm text-muted-foreground'>
										Esta política se aplica a toda la
										organización cuando guardas los cambios.
									</p>
								</div>
								<SelectField
									label='Modo de acceso'
									options={MODE_OPTIONS}
									value={mode}
									onValueChange={setMode}
									disabled={pending || loading || !policy}
								/>
								<p className='text-sm text-muted-foreground'>
									{mode?.value === 'local'
										? 'Los usuarios ingresan con email y contraseña. El acceso SSO queda deshabilitado para esta organización.'
										: mode?.value === 'mixed'
											? 'Los usuarios pueden ingresar con contraseña o con el proveedor SSO seleccionado.'
											: 'Los usuarios deben entrar con SSO para acceder a esta organización. Vincula sus cuentas antes de aplicar este modo.'}
								</p>
								{mode?.value !== 'local' && (
									<>
										<SelectField
											label='Conexión para el acceso SSO'
											placeholder='Selecciona una conexión probada'
											options={connections.map(
												(connection) => ({
													value: connection.id,
													label: connection.name,
													disabled:
														connection.tested_version !==
														connection.config_version,
												}),
											)}
											value={selected}
											onValueChange={setSelected}
											disabled={pending || loading}
										/>
										{!canActivate && (
											<p
												role='status'
												className='text-sm text-muted-foreground'
											>
												Selecciona una conexión con una
												prueba completada. Puedes
												probarla en el paso 2.
											</p>
										)}
										<p className='text-sm text-muted-foreground'>
											Cada usuario debe vincular su
											identidad desde Mi cuenta → Acceso
											empresarial. La coincidencia del
											correo no vincula cuentas
											automáticamente.
										</p>
									</>
								)}
								<div className='flex flex-wrap items-center gap-3 border-t pt-5'>
									<Button
										disabled={
											pending ||
											loading ||
											!policy ||
											!mode ||
											!canActivate
										}
										onClick={applyPolicy}
									>
										{pending
											? 'Guardando...'
											: 'Guardar acceso'}
									</Button>
									<p className='text-xs text-muted-foreground'>
										Los cambios de acceso se aplican al
										guardar.
									</p>
								</div>
							</section>
						)}
					</>
				)}
			</div>
		</div>
	)
}

function ProviderURL({
	label,
	value,
	description,
	openable = false,
}: {
	label: string
	value: string
	description: string
	openable?: boolean
}) {
	return (
		<div className='space-y-2'>
			<p className='text-sm font-medium'>{label}</p>
			<div className='flex min-w-0 items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2'>
				<code className='min-w-0 flex-1 break-all text-sm'>
					{value}
				</code>
				<CopyButton value={value} className='shrink-0' />
				{openable && (
					<Button
						variant='ghost'
						size='icon-sm'
						title='Abrir página de acceso'
						onClick={() =>
							window.open(value, '_blank', 'noopener,noreferrer')
						}
					>
						<ExternalLink />
						<span className='sr-only'>Abrir página de acceso</span>
					</Button>
				)}
			</div>
			<p className='text-xs leading-relaxed text-muted-foreground'>
				{description}
			</p>
		</div>
	)
}
