import type { FC } from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { SsoAccessButton } from './sso-access-button'

interface SsoLoginCardProps {
	providerId: string
	providerName: string
	hasCallbackError?: boolean
}

export const SsoLoginCard: FC<SsoLoginCardProps> = ({
	providerId,
	providerName,
	hasCallbackError = false,
}) => (
	<Card>
		<CardHeader>
			<CardTitle>Iniciar sesión</CardTitle>
			<CardDescription>
				Serás redirigido al proveedor de identidad de tu organización.
			</CardDescription>
		</CardHeader>
		<CardContent className='space-y-4'>
			{hasCallbackError ? (
				<p className='text-sm text-destructive' role='alert'>
					No se pudo completar el inicio de sesión. Inténtalo
					nuevamente.
				</p>
			) : null}
			<SsoAccessButton
				providerId={providerId}
				providerName={providerName}
				callbackURL='/auth/sso/complete'
				autoStart={!hasCallbackError}
			/>
		</CardContent>
	</Card>
)
