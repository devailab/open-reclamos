import { Code, ConnectError } from '@connectrpc/connect'
import {
	OpGetInstallationStatus,
	OpGetLoginOptions,
	OpGetSession,
	OpInstall,
	OpListOrganizations,
	OpLogin,
	OpRegister,
	OpSwitchOrganization,
	OpVerifyEmail,
} from '@open-reclamos/rpc-client'
import { authenticatedFetch, rpc } from '@/shared/api/rpc'

export async function startAuthenticatedSSO(
	startUrl: string,
	newWindow = false,
	signal?: AbortSignal,
) {
	const url = new URL(startUrl, window.location.origin)

	if (!/^\/auth\/sso\/[^/]+\/start$/.test(url.pathname)) {
		throw new Error('Enlace SSO inválido.')
	}

	const popup = newWindow ? window.open('', '_blank') : null

	if (newWindow && !popup) {
		throw new Error('Permite las ventanas emergentes para probar SSO.')
	}

	if (popup) {
		popup.opener = null
	}

	try {
		const response = await authenticatedFetch(url.pathname + url.search, {
			method: 'POST',
			signal,
		})

		if (!response.ok) {
			throw new Error(
				'No se pudo iniciar SSO. Comprueba tu acceso local.',
			)
		}

		const result = record(await response.json())
		const target = new URL(text(result.url))

		if (!['https:', 'http:'].includes(target.protocol)) {
			throw new Error('Destino SSO inválido.')
		}

		signal?.throwIfAborted()

		if (popup) {
			popup.location.replace(target.href)
		} else {
			window.location.assign(target.href)
		}
	} catch (error) {
		popup?.close()

		throw error
	}
}

import {
	listRecords,
	loginResult,
	type Request,
	record,
	text,
} from '../../shared/api/responses'
import {
	canCreateOrganization,
	hasTenantAccess,
	sessionDestination,
} from './policy'
import type {
	InstallationStatus,
	LoginOptions,
	OrganizationDTO,
	SessionDTO,
} from './types'

export async function getInstallationStatus(
	signal?: AbortSignal,
	request: Request = rpc,
): Promise<InstallationStatus> {
	signal?.throwIfAborted()

	const data = record(
		await request(OpGetInstallationStatus, undefined, signal),
	)

	signal?.throwIfAborted()

	if (
		typeof data.installed !== 'boolean' ||
		typeof data.public_registration !== 'boolean'
	) {
		throw new Error('El estado de instalación no es válido.')
	}

	return {
		installed: data.installed,
		public_registration: data.public_registration,
	}
}

export async function getLoginOptions(
	slug: string,
	signal?: AbortSignal,
	request: Request = rpc,
): Promise<LoginOptions> {
	signal?.throwIfAborted()

	const data = record(await request(OpGetLoginOptions, { id: slug }, signal))

	signal?.throwIfAborted()

	const organization = record(data.organization)

	if (
		organization.slug !== slug ||
		!['local', 'mixed', 'sso_required'].includes(String(data.login_mode))
	) {
		throw new Error('Las opciones de acceso no son válidas.')
	}

	const result: LoginOptions = {
		organization: { slug, name: text(organization.name) },
		login_mode: data.login_mode as LoginOptions['login_mode'],
	}

	if (data.sso != null) {
		const sso = record(data.sso)
		const startURL = text(sso.start_url)
		const url = new URL(startURL)

		if (
			!['https:', 'http:'].includes(url.protocol) ||
			!/^\/auth\/sso\/[^/]+\/start$/.test(url.pathname)
		) {
			throw new Error('La URL de acceso empresarial no es válida.')
		}

		result.sso = {
			name: text(sso.name),
			protocol: text(sso.protocol),
			start_url: startURL,
		}
	}

	return result
}

export async function resolveSSOLogin(
	domain: string,
	signal?: AbortSignal,
): Promise<string> {
	const result = await rpc<{ organization: { slug: string }; sso?: unknown }>(
		OpGetLoginOptions,
		{ data: { business_domain: domain.trim().toLowerCase() } },
		signal,
	)

	if (!result.organization?.slug || !result.sso) {
		throw new Error(
			'No encontramos un acceso SSO disponible para ese dominio empresarial.',
		)
	}

	return `/login/${encodeURIComponent(result.organization.slug)}`
}

export function listOrganizations(
	signal?: AbortSignal,
	request: Request = rpc,
) {
	return listRecords<OrganizationDTO>(
		OpListOrganizations,
		(value) => {
			const data = record(value)

			return {
				id: text(data.id),
				name: text(data.name),
				slug: text(data.slug),
				role: text(data.role),
				status: text(data.status),
			}
		},
		signal,
		request,
	)
}

export async function getSession(
	signal?: AbortSignal,
	request: Request = rpc,
): Promise<SessionDTO> {
	signal?.throwIfAborted()

	const data = record(await request(OpGetSession, undefined, signal))

	signal?.throwIfAborted()

	const user = record(data.user)

	if (
		typeof data.organization_id !== 'string' ||
		typeof user.is_platform_admin !== 'boolean'
	) {
		throw new Error('La respuesta de sesión no es válida.')
	}

	return {
		user: {
			id: text(user.id),
			name: text(user.name),
			last_name: text(user.last_name),
			email: text(user.email),
			is_platform_admin: user.is_platform_admin,
		},
		organization_id: data.organization_id,
		auth_method: text(data.auth_method),
		role: data.role == null ? undefined : text(data.role),
	}
}

export async function selectOrganization(
	slug?: string,
	signal?: AbortSignal,
	request: Request = rpc,
): Promise<string> {
	const session = await getSession(signal, request)
	// GetSession solo incluye role cuando Tenant ha autorizado la empresa activa.
	if (!slug && hasTenantAccess(session)) {
		return '/dashboard'
	}

	const organizations = await listOrganizations(signal, request)
	const active = organizations.filter((item) => item.status === 'active')

	const organization = slug
		? active.find((item) => item.slug === slug)
		: (active.find((item) => item.id === session.organization_id) ??
			active[0])

	if (organization) {
		try {
			// Go valida el grant también para mixed y sso_required; no inferirlo del método global.
			const switched = record(
				await request(
					OpSwitchOrganization,
					{ id: organization.id },
					signal,
				),
			)

			signal?.throwIfAborted()

			if (
				switched.organization_id !== organization.id ||
				!['admin', 'operator', 'viewer'].includes(String(switched.role))
			) {
				throw new Error('El servidor no confirmó el cambio de empresa.')
			}

			return '/dashboard'
		} catch (error) {
			signal?.throwIfAborted()

			if (ConnectError.from(error).code !== Code.PermissionDenied) {
				throw error
			}

			const options = await getLoginOptions(
				organization.slug,
				signal,
				request,
			)

			return options.sso
				? `/login/${encodeURIComponent(organization.slug)}`
				: `/login/${encodeURIComponent(organization.slug)}?local=1`
		}
	}

	if (slug) {
		throw new Error('Tu cuenta no tiene acceso a esta empresa.')
	}

	const status = await getInstallationStatus(signal, request)

	return canCreateOrganization(
		session,
		status.public_registration,
		organizations,
	)
		? '/setup'
		: '/dashboard/account'
}

async function destinationForSession(
	session: SessionDTO,
	signal?: AbortSignal,
	request: Request = rpc,
) {
	if (hasTenantAccess(session)) {
		return '/dashboard'
	}

	const [status, organizations] = await Promise.all([
		getInstallationStatus(signal, request),
		listOrganizations(signal, request),
	])

	signal?.throwIfAborted()

	return sessionDestination(session, status, organizations)
}

export async function getSessionDestination(
	signal?: AbortSignal,
	request: Request = rpc,
) {
	return destinationForSession(
		await getSession(signal, request),
		signal,
		request,
	)
}

// Resultado de un acceso local: sesión abierta o email pendiente de verificar.
export type AuthOutcome =
	| { verificationRequired: false; destination: string }
	| { verificationRequired: true; email: string; emailSent: boolean }

// Go responde sin sesión cuando el registro público exige verificar el email.
function pendingVerification(value: unknown): AuthOutcome | null {
	const data = record(value)

	return data.verification_required === true
		? {
				verificationRequired: true,
				email: text(data.email),
				emailSent: data.email_sent !== false,
			}
		: null
}

async function confirmLocalSession(
	value: unknown,
	message: string,
	signal?: AbortSignal,
	request: Request = rpc,
) {
	const userId = loginResult(value)

	signal?.throwIfAborted()

	const session = await getSession(signal, request)

	if (session.user.id !== userId || session.auth_method !== 'local') {
		throw new Error(message)
	}

	return session
}

export async function authenticateLocal(
	data: { email: string; password: string },
	slug?: string,
	signal?: AbortSignal,
	request: Request = rpc,
): Promise<AuthOutcome> {
	signal?.throwIfAborted()

	const response = await request(
		OpLogin,
		{
			data: {
				email: data.email.trim().toLowerCase(),
				password: data.password,
			},
		},
		signal,
	)

	const pending = pendingVerification(response)

	if (pending) {
		return pending
	}

	await confirmLocalSession(
		response,
		'No se pudo confirmar la nueva sesión local.',
		signal,
		request,
	)

	return {
		verificationRequired: false,
		destination: await selectOrganization(slug, signal, request),
	}
}

export async function registerAccount(
	data: {
		name: string
		lastName: string
		email: string
		password: string
		documentType: string
		documentNumber: string
	},
	signal?: AbortSignal,
	request: Request = rpc,
): Promise<AuthOutcome> {
	signal?.throwIfAborted()

	const response = await request(
		OpRegister,
		{
			data: {
				name: data.name.trim(),
				last_name: data.lastName.trim(),
				email: data.email.trim().toLowerCase(),
				password: data.password,
				document_type: data.documentType,
				document_number: data.documentNumber.trim(),
			},
		},
		signal,
	)

	const pending = pendingVerification(response)

	if (pending) {
		return pending
	}

	const session = await confirmLocalSession(
		response,
		'No se pudo confirmar la cuenta creada.',
		signal,
		request,
	)

	return {
		verificationRequired: false,
		destination: await destinationForSession(session, signal, request),
	}
}

// Reenvía el código repitiendo el login. Si la cuenta ya no requiere verificación,
// devuelve el destino de la sesión abierta.
export async function resendVerification(
	data: { email: string; password: string },
	slug?: string,
	signal?: AbortSignal,
	request: Request = rpc,
): Promise<string | null> {
	const outcome = await authenticateLocal(data, slug, signal, request)

	if (!outcome.verificationRequired) {
		return outcome.destination
	}

	if (!outcome.emailSent) {
		throw new Error('No se pudo enviar el correo. Intenta nuevamente.')
	}

	return null
}

// Confirma el código enviado al email y abre la sesión local de la cuenta.
export async function verifyEmail(
	data: { email: string; code: string },
	slug?: string,
	signal?: AbortSignal,
	request: Request = rpc,
) {
	signal?.throwIfAborted()

	const session = await confirmLocalSession(
		await request(
			OpVerifyEmail,
			{
				data: {
					email: data.email.trim().toLowerCase(),
					code: data.code,
				},
			},
			signal,
		),
		'No se pudo confirmar la cuenta verificada.',
		signal,
		request,
	)

	return slug
		? selectOrganization(slug, signal, request)
		: destinationForSession(session, signal, request)
}

export async function installPlatform(
	data: {
		name: string
		lastName: string
		email: string
		password: string
		documentType: string
		documentNumber: string
	},
	signal?: AbortSignal,
	request: Request = rpc,
) {
	signal?.throwIfAborted()

	const userId = loginResult(
		await request(
			OpInstall,
			{
				data: {
					name: data.name.trim(),
					last_name: data.lastName.trim(),
					email: data.email.trim().toLowerCase(),
					password: data.password,
					document_type: data.documentType,
					document_number: data.documentNumber.trim(),
				},
			},
			signal,
		),
	)

	signal?.throwIfAborted()

	const session = await getSession(signal, request)

	if (
		session.user.id !== userId ||
		session.auth_method !== 'local' ||
		!session.user.is_platform_admin
	) {
		throw new Error(
			'No se pudo confirmar la sesión del administrador inicial.',
		)
	}

	return '/setup'
}

export function ssoStartURL(
	options: LoginOptions,
	purpose: 'link' | 'login',
): string {
	if (!options.sso) {
		throw new Error('Esta empresa no tiene una conexión SSO disponible.')
	}

	const url = new URL(options.sso.start_url)

	if (
		!['https:', 'http:'].includes(url.protocol) ||
		!/^\/auth\/sso\/[^/]+\/start$/.test(url.pathname)
	) {
		throw new Error('La URL de acceso empresarial no es válida.')
	}

	url.searchParams.set('purpose', purpose)

	return url.toString()
}
