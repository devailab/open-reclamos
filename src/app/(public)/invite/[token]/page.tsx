import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { FC } from 'react'
import { Badge } from '@/components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { db } from '@/database/database'
import { users } from '@/database/schema'
import { getSession } from '@/lib/auth-server'
import { hashInvitationToken } from '@/modules/users/lib'
import { getInvitationDetailsByTokenHash } from '@/modules/users/queries'
import { InviteAcceptanceForm } from './_features/invite-acceptance-form'

interface InvitePageProps {
	params: Promise<{ token: string }>
}

const InvitePage: FC<InvitePageProps> = async ({ params }) => {
	const session = await getSession()
	if (session) {
		const [userData] = await db
			.select({ setupStatus: users.setupStatus })
			.from(users)
			.where(eq(users.id, session.user.id))
			.limit(1)
		if (userData?.setupStatus === 'complete') {
			redirect('/dashboard')
		}
	}

	const { token } = await params
	const invitation = await getInvitationDetailsByTokenHash(
		hashInvitationToken(token),
	)

	if (!invitation) {
		return (
			<div className='min-h-svh bg-muted/30 p-4 flex items-center justify-center'>
				<Card className='w-full max-w-lg'>
					<CardHeader>
						<CardTitle>Enlace no válido</CardTitle>
						<CardDescription>
							Este enlace de invitación no existe, expiró o ya fue
							usado.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-3'>
						<p className='text-sm text-muted-foreground'>
							Pide a quien te invitó que genere un nuevo enlace.
						</p>
						<Link
							href='/login'
							className='inline-flex h-8 items-center justify-center rounded-lg border px-3 text-sm font-medium hover:bg-muted'
						>
							Ir a iniciar sesión
						</Link>
					</CardContent>
				</Card>
			</div>
		)
	}

	const isExpired = invitation.expiresAt.getTime() < Date.now()
	const isBlocked = Boolean(
		invitation.revokedAt || invitation.acceptedAt || isExpired,
	)

	return (
		<div className='min-h-svh bg-muted/30 p-4 pt-10'>
			<div className='mx-auto flex w-full max-w-lg flex-col gap-6'>
				<Card className='border-0 shadow-none'>
					<CardHeader>
						<Badge variant='secondary' className='w-fit'>
							Invitación de equipo
						</Badge>
						<CardTitle className='text-3xl'>
							Únete a {invitation.organizationName}
						</CardTitle>
						<CardDescription className='text-base'>
							Completa tu registro para acceder con el rol de{' '}
							{invitation.roleName}.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-3 text-sm text-muted-foreground'>
						<p>
							Tu correo será registrado como{' '}
							<span className='font-medium text-foreground'>
								{invitation.email}
							</span>
							.
						</p>
						<p>
							Acceso a tiendas:{' '}
							<span className='font-medium text-foreground'>
								{invitation.storeAccessMode === 'all'
									? 'Todas las tiendas'
									: invitation.storeNames.length > 0
										? invitation.storeNames.join(', ')
										: 'Tiendas seleccionadas'}
							</span>
						</p>
						{isBlocked && (
							<p className='rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive'>
								{invitation.revokedAt
									? 'Esta invitación fue revocada.'
									: invitation.acceptedAt
										? 'Esta invitación ya fue utilizada.'
										: 'Esta invitación expiró.'}
							</p>
						)}
					</CardContent>
				</Card>

				<div>
					<InviteAcceptanceForm
						token={token}
						email={invitation.email}
						isDisabled={isBlocked}
					/>
				</div>
			</div>
		</div>
	)
}

export default InvitePage
