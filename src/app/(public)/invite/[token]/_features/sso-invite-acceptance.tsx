'use client'

import { type FC, useTransition } from 'react'
import { sileo } from 'sileo'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { SsoAccessButton } from '@/modules/auth/components/sso-access-button'
import { $acceptSsoInvitationAction } from '@/modules/users/actions'

interface SsoInviteAcceptanceProps {
	token: string
	invitationEmail: string
	sessionEmail: string | null
	providerId: string
	providerName: string
	isDisabled?: boolean
}

export const SsoInviteAcceptance: FC<SsoInviteAcceptanceProps> = ({
	token,
	invitationEmail,
	sessionEmail,
	providerId,
	providerName,
	isDisabled = false,
}) => {
	const [isPending, startTransition] = useTransition()
	const callbackURL = `/invite/${encodeURIComponent(token)}`
	const emailMatches =
		sessionEmail?.toLowerCase() === invitationEmail.toLowerCase()

	const acceptInvitation = () => {
		startTransition(async () => {
			const result = await $acceptSsoInvitationAction(token)
			if ('error' in result) {
				sileo.error({
					title: 'No se pudo aceptar la invitación',
					description: result.error,
				})
			}
		})
	}

	return (
		<Card className='w-full max-w-lg'>
			<CardHeader>
				<CardTitle>Acceso corporativo</CardTitle>
				<CardDescription>
					Autentícate con {providerName} usando el correo{' '}
					{invitationEmail}.
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				{sessionEmail && !emailMatches ? (
					<p className='text-sm text-destructive' role='alert'>
						La sesión actual pertenece a {sessionEmail}. Debes
						acceder con {invitationEmail}.
					</p>
				) : null}
				{emailMatches ? (
					<Button
						type='button'
						className='w-full'
						disabled={isDisabled || isPending}
						onClick={acceptInvitation}
					>
						{isPending ? (
							<Spinner />
						) : (
							'Aceptar invitación y entrar'
						)}
					</Button>
				) : (
					<SsoAccessButton
						providerId={providerId}
						providerName={providerName}
						callbackURL={callbackURL}
						errorCallbackURL={`${callbackURL}?sso_error=1`}
						disabled={isDisabled}
					/>
				)}
			</CardContent>
		</Card>
	)
}
