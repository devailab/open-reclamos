'use client'

import { FileText, Mail, Send } from 'lucide-react'
import { useState, useTransition } from 'react'
import { sileo } from 'sileo'
import TextField from '@/components/forms/text-field'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useForm } from '@/hooks/use-form'
import { combine, email, required } from '@/lib/validators'
import { $sendOrganizationTestEmailAction } from '@/modules/settings/actions'

interface EmailTestFormValues {
	recipientEmail: string | null
}

interface EmailTestCardProps {
	defaultRecipientEmail: string
	canManage: boolean
}

export function EmailTestCard({
	defaultRecipientEmail,
	canManage,
}: EmailTestCardProps) {
	const initialValues: EmailTestFormValues = {
		recipientEmail: defaultRecipientEmail,
	}

	const [values, setValues] = useState<EmailTestFormValues>(initialValues)
	const [isPending, startTransition] = useTransition()
	const { register, validate } = useForm({
		values,
		setValues,
		initialValues,
	})

	const handleSubmit = () => {
		const errors = validate({ focus: 'first' })
		if (errors.length > 0) return

		startTransition(async () => {
			const result = await $sendOrganizationTestEmailAction({
				recipientEmail: values.recipientEmail,
			})

			if ('error' in result) {
				sileo.error({
					title: 'No se pudo enviar la prueba',
					description: result.error,
				})
				return
			}

			sileo.success({
				title: 'Correo de prueba enviado',
				description: `Se envió un correo con PDF adjunto a ${result.recipientEmail}.`,
			})
		})
	}

	const disabled = isPending || !canManage

	return (
		<div className='max-w-3xl pt-2'>
			<Card className='border-dashed'>
				<CardHeader>
					<CardTitle className='flex items-center gap-2 text-base'>
						<Mail className='size-4' />
						Prueba de correo y PDF
					</CardTitle>
					<CardDescription>
						Envía un correo de prueba usando el transporte
						configurado y adjunta un PDF generado en el servidor.
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					{!canManage && (
						<div className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
							Solo los administradores pueden ejecutar esta
							prueba.
						</div>
					)}

					<div className='rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground'>
						Esta prueba genera el archivo{' '}
						<span className='font-medium text-foreground'>
							prueba-open-reclamos.pdf
						</span>{' '}
						y lo adjunta al correo enviado.
					</div>

					<TextField
						{...register('recipientEmail')}
						label='Correo de destino'
						placeholder='destinatario@empresa.com'
						type='email'
						validate={combine(required, email)}
						prefix={<Mail className='size-3.5' />}
						disabled={disabled}
					/>

					<Separator />

					<div className='rounded-lg border bg-muted/20 p-4'>
						<div className='mb-2 flex items-center gap-2 text-sm font-medium'>
							<FileText className='size-4' />
							Qué valida esta prueba
						</div>
						<p className='text-sm text-muted-foreground'>
							Comprueba la conexión SMTP, el envío del correo y la
							generación del PDF adjunto en un solo paso.
						</p>
					</div>

					<div className='flex justify-end'>
						<Button onClick={handleSubmit} disabled={disabled}>
							<Send className='size-4' />
							{isPending ? 'Enviando prueba...' : 'Enviar prueba'}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
