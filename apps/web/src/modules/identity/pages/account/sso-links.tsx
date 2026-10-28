import { useCallback, useTransition } from 'react'
import { Link } from 'react-router'
import { sileo } from 'sileo'
import { Button } from '@/shared/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/shared/components/ui/card'
import {
	getLoginOptions,
	listOrganizations,
	ssoStartURL,
	startAuthenticatedSSO,
} from '../../api'
import { useAuthQuery } from '../../hooks/use-auth-query'

export function SsoLinks({
	userId,
	local,
}: {
	userId: string
	local: boolean
}) {
	const [pending, startTransition] = useTransition()

	const connections = useAuthQuery(
		useCallback(
			async (signal: AbortSignal) => {
				if (!userId) {
					return []
				}

				const organizations = await listOrganizations(signal)

				return Promise.all(
					organizations
						.filter(
							(organization) => organization.status === 'active',
						)
						.map(async (organization) => ({
							organization,
							options: await getLoginOptions(
								organization.slug,
								signal,
							),
						})),
				)
			},
			[userId],
		),
	)

	return (
		<Card>
			<CardHeader>
				<CardTitle className='text-base'>Acceso empresarial</CardTitle>
				<CardDescription>
					{local
						? 'Vincula explícitamente tu cuenta local con la identidad de tu empresa. Las cuentas no se unen automáticamente por correo.'
						: 'Iniciaste sesión con el proveedor de identidad de tu empresa. Para vincular otra identidad, inicia sesión con tu contraseña local.'}
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-3'>
				{connections.loading ? (
					<p role='status'>Cargando empresas...</p>
				) : connections.error ? (
					<div role='alert'>
						{connections.error}
						<Button onClick={connections.retry}>Reintentar</Button>
					</div>
				) : connections.data?.length ? (
					connections.data.map(({ organization, options }) => (
						<div
							key={organization.id}
							className='space-y-2 rounded-lg border p-3'
						>
							<p className='text-sm font-medium'>
								{organization.name}
							</p>
							{options.sso ? (
								<div className='flex flex-wrap gap-2'>
									{local ? (
										<Button
											variant='outline'
											disabled={pending}
											onClick={() =>
												startTransition(async () => {
													try {
														await startAuthenticatedSSO(
															ssoStartURL(
																options,
																'link',
															),
														)
													} catch (error) {
														sileo.error({
															title: 'No se pudo vincular la identidad',
															description:
																error instanceof
																Error
																	? error.message
																	: 'Inténtalo nuevamente.',
														})
													}
												})
											}
										>
											Vincular identidad con{' '}
											{options.sso.name}
										</Button>
									) : null}
									<Button
										onClick={() =>
											window.location.assign(
												ssoStartURL(options, 'login'),
											)
										}
									>
										Acceder con {options.sso.name}
									</Button>
									{local ? (
										<p className='w-full text-xs text-muted-foreground'>
											Si acabas de vincular tu identidad,
											pulsa «Acceder» para iniciar sesión
											y habilitar el acceso a esta
											empresa.
										</p>
									) : null}
								</div>
							) : (
								<p className='text-sm text-muted-foreground'>
									Esta empresa utiliza acceso local.{' '}
									<Link
										to={`/login/${encodeURIComponent(organization.slug)}?local=1`}
										className='text-primary hover:underline'
									>
										Confirmar acceso local
									</Link>
								</p>
							)}
						</div>
					))
				) : (
					<p className='text-sm text-muted-foreground'>
						No tienes empresas disponibles. Usa el enlace de
						invitación enviado por tu administrador.
					</p>
				)}
			</CardContent>
		</Card>
	)
}
