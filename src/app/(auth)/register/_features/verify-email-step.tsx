'use client'

import { type FC, useState, useTransition } from 'react'
import OtpField from '@/components/forms/otp-field'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useForm } from '@/hooks/use-form'
import { validateOtpCode } from '@/modules/auth/validation'

interface OtpValues {
	code: string | null
}

const INITIAL_VALUES: OtpValues = { code: null }

interface VerifyEmailStepProps {
	email: string
	onSubmit: (code: string) => Promise<void>
	onResend: () => Promise<void>
}

export const VerifyEmailStep: FC<VerifyEmailStepProps> = ({
	email,
	onSubmit,
	onResend,
}) => {
	const [values, setValues] = useState<OtpValues>(INITIAL_VALUES)
	const [isPending, startTransition] = useTransition()
	const [isResending, startResendTransition] = useTransition()

	const { register, validate } = useForm({
		values,
		setValues,
		initialValues: INITIAL_VALUES,
	})

	const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault()
		const errors = validate({ focus: 'first' })
		if (errors.length > 0) return

		startTransition(async () => {
			await onSubmit(values.code ?? '')
		})
	}

	const handleResend = () => {
		startResendTransition(async () => {
			await onResend()
		})
	}

	return (
		<form onSubmit={handleSubmit} className='flex flex-col gap-4'>
			<p className='text-sm text-muted-foreground'>
				Enviamos un código de 6 dígitos a{' '}
				<span className='font-medium text-foreground'>{email}</span>.
				Revisa también tu carpeta de <strong>spam</strong>.
			</p>
			<OtpField
				{...register('code')}
				label='Código de verificación'
				validate={validateOtpCode}
				disabled={isPending}
			/>
			<Button
				type='submit'
				className='w-full'
				disabled={isPending || isResending}
			>
				{isPending ? <Spinner /> : 'Verificar y crear cuenta'}
			</Button>
			<Button
				type='button'
				variant='ghost'
				className='w-full'
				disabled={isPending || isResending}
				onClick={handleResend}
			>
				{isResending ? <Spinner /> : 'Reenviar código'}
			</Button>
		</form>
	)
}
