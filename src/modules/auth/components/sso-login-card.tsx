'use client'

import { type FC, useEffect, useState } from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { SsoAccessButton } from './sso-access-button'

const CALLBACK_ERROR_DELAY_MS = 1500

interface SsoLoginCardProps {
	providerId: string
	providerName: string
	hasCallbackError?: boolean
}

export const SsoLoginCard: FC<SsoLoginCardProps> = ({
	providerId,
	providerName,
	hasCallbackError = false,
}) => {
	const [showRetry, setShowRetry] = useState(false)

	useEffect(() => {
		if (!hasCallbackError) {
			setShowRetry(false)
			return
		}

		const timeoutId = window.setTimeout(() => {
			setShowRetry(true)
		}, CALLBACK_ERROR_DELAY_MS)

		return () => window.clearTimeout(timeoutId)
	}, [hasCallbackError])

	if (!showRetry) {
		return (
			<div
				className='flex min-h-48 flex-col items-center justify-center gap-3'
				role='status'
			>
				<Spinner className='size-8 text-muted-foreground' />
				<span className='sr-only'>Iniciando sesión</span>
				{!hasCallbackError ? (
					<div aria-hidden='true' hidden>
						<SsoAccessButton
							providerId={providerId}
							providerName={providerName}
							callbackURL='/auth/sso/complete'
							autoStart
						/>
					</div>
				) : null}
			</div>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>No se pudo iniciar sesión</CardTitle>
				<CardDescription>
					Vuelve a conectarte con el proveedor de identidad de tu
					organización.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<SsoAccessButton
					providerId={providerId}
					providerName={providerName}
					callbackURL='/auth/sso/complete'
				/>
			</CardContent>
		</Card>
	)
}
