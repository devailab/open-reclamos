import { type FC, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import OtpField from '@/shared/components/forms/otp-field'
import { Button } from '@/shared/components/ui/button'
import { Spinner } from '@/shared/components/ui/spinner'
import { useForm } from '@/shared/hooks/use-form'
import { errorMessage, validateVerificationCode } from '../validation'

interface EmailVerificationStepProps {
	email: string
	onVerify: (code: string) => Promise<void>
	onResend: () => Promise<void>
	// Vuelve al formulario anterior, por ejemplo para corregir el email.
	onBack: () => void
}

const INITIAL_VALUES = { code: null as string | null }

// Aviso cuando la cuenta quedó pendiente pero el SMTP no entregó el código.
export function notifyCodeNotSent() {
	sileo.error({
		title: 'No se pudo enviar el código',
		description: 'Usa «Reenviar código» para intentarlo de nuevo.',
	})
}

// Pide el código de 6 dígitos enviado al correo antes de abrir la sesión.
export const EmailVerificationStep: FC<EmailVerificationStepProps> = ({
	email,
	onVerify,
	onResend,
	onBack,
}) => {
	const [values, setValues] = useState(INITIAL_VALUES)
	const [isPending, startTransition] = useTransition()
	const [isResending, startResend] = useTransition()

	const { register, validate } = useForm({
		values,
		setValues,
		initialValues: INITIAL_VALUES,
	})

	const busy = isPending || isResending

	return (
		<form
			className='flex flex-col gap-4'
			onSubmit={(event) => {
				event.preventDefault()

				if (validate({ focus: 'first' }).length) {
					return
				}

				startTransition(() => onVerify(values.code ?? ''))
			}}
		>
			<p className='text-sm text-muted-foreground'>
				Enviamos un código de verificación a{' '}
				<span className='font-medium text-foreground'>{email}</span>.
				Vence en 15 minutos.
			</p>
			<OtpField
				{...register('code')}
				label='Código de verificación'
				validate={validateVerificationCode}
				disabled={busy}
			/>
			<Button type='submit' className='w-full' disabled={busy}>
				{isPending ? <Spinner /> : 'Verificar y continuar'}
			</Button>
			<Button
				type='button'
				variant='ghost'
				disabled={busy}
				onClick={() =>
					startResend(async () => {
						try {
							await onResend()

							sileo.success({
								title: 'Revisa tu correo',
								description:
									'Si pasó más de un minuto, te enviamos un código nuevo.',
							})
						} catch (error) {
							sileo.error({
								title: 'No se pudo reenviar el código',
								description: errorMessage(error),
							})
						}
					})
				}
			>
				{isResending ? <Spinner /> : 'Reenviar código'}
			</Button>
			<Button
				type='button'
				variant='link'
				disabled={busy}
				onClick={onBack}
			>
				Usar otro correo
			</Button>
		</form>
	)
}
