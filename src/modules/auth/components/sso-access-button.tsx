'use client'

import { type FC, useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { authClient } from '@/lib/auth-client'

interface SsoAccessButtonProps {
	providerId: string
	providerName: string
	callbackURL: string
	errorCallbackURL?: string
	autoStart?: boolean
	disabled?: boolean
}

export const SsoAccessButton: FC<SsoAccessButtonProps> = ({
	providerId,
	providerName,
	callbackURL,
	errorCallbackURL = '/login?sso_error=1',
	autoStart = false,
	disabled = false,
}) => {
	const hasStarted = useRef(false)
	const [isPending, setIsPending] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const startSso = useCallback(async () => {
		if (isPending || disabled) return

		setIsPending(true)
		setError(null)
		const { error: signInError } = await authClient.signIn.oauth2({
			providerId,
			callbackURL,
			newUserCallbackURL: callbackURL,
			errorCallbackURL,
		})

		if (signInError) {
			setError(
				signInError.message ??
					'No se pudo conectar con el proveedor de identidad.',
			)
			setIsPending(false)
		}
	}, [callbackURL, disabled, errorCallbackURL, isPending, providerId])

	useEffect(() => {
		if (!autoStart || hasStarted.current) return
		hasStarted.current = true
		void startSso()
	}, [autoStart, startSso])

	return (
		<div className='space-y-3'>
			<Button
				type='button'
				className='w-full'
				disabled={disabled || isPending}
				onClick={startSso}
			>
				{isPending ? <Spinner /> : `Continuar con ${providerName}`}
			</Button>
			{error ? (
				<p className='text-sm text-destructive' role='alert'>
					{error}
				</p>
			) : null}
		</div>
	)
}
