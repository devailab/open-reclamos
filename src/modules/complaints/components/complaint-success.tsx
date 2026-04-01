'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, CheckCircle2, Copy } from 'lucide-react'
import { type FC, useState } from 'react'
import { sileo } from 'sileo'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

interface ComplaintSuccessProps {
	trackingCode: string
	correlative: string
	responseDeadline: Date
}

const CopyButton = ({ text }: { text: string }) => {
	const [copied, setCopied] = useState(false)

	const handleCopy = async () => {
		await navigator.clipboard.writeText(text)
		sileo.success({
			title: 'Código copiado',
		})
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<button
			type='button'
			onClick={handleCopy}
			className='ml-1 transition-colors'
			aria-label='Copiar'
		>
			{copied ? (
				<Check className='h-3.5 w-3.5 text-green-500' />
			) : (
				<Copy className='h-3.5 w-3.5 text-muted-foreground hover:text-foreground' />
			)}
		</button>
	)
}

export const ComplaintSuccess: FC<ComplaintSuccessProps> = ({
	trackingCode,
	correlative,
	responseDeadline,
}) => {
	const deadlineFormatted = format(
		responseDeadline,
		"d 'de' MMMM 'de' yyyy",
		{
			locale: es,
		},
	)

	return (
		<Dialog open modal disablePointerDismissal onOpenChange={() => {}}>
			<DialogContent showCloseButton={false} className='sm:max-w-md'>
				<DialogHeader>
					<div className='flex flex-col items-center gap-3 py-2 text-center'>
						<div className='flex h-14 w-14 items-center justify-center rounded-full bg-green-100'>
							<CheckCircle2 className='h-8 w-8 text-green-600' />
						</div>
						<DialogTitle className='text-lg'>
							¡Reclamo registrado con éxito!
						</DialogTitle>
						<p className='text-sm text-muted-foreground'>
							Tu reclamo ha sido recibido y será atendido en el
							plazo establecido.
						</p>
					</div>
				</DialogHeader>

				<Separator />

				<div className='space-y-3 rounded-lg bg-muted/50 p-4'>
					<div className='flex items-center justify-between'>
						<span className='text-xs text-muted-foreground uppercase tracking-wide'>
							Código de seguimiento
						</span>
						<span className='flex items-center font-mono text-sm font-semibold'>
							{trackingCode}
							<CopyButton text={trackingCode} />
						</span>
					</div>

					<div className='flex items-center justify-between'>
						<span className='text-xs text-muted-foreground uppercase tracking-wide'>
							Correlativo
						</span>
						<span className='font-mono text-sm'>{correlative}</span>
					</div>

					<Separator className='my-1' />

					<div className='flex items-center justify-between'>
						<span className='text-xs text-muted-foreground uppercase tracking-wide'>
							Fecha límite de respuesta
						</span>
						<span className='text-sm font-medium'>
							{deadlineFormatted}
						</span>
					</div>
				</div>

				<div className='rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700'>
					Recibirás una respuesta antes del{' '}
					<strong>{deadlineFormatted}</strong>. Guarda tu código de
					seguimiento para consultar el estado de tu reclamo. También
					procesaremos el envío de una constancia en PDF al correo que
					registraste.
				</div>

				<p className='text-center text-xs text-muted-foreground'>
					Puedes cerrar esta ventana sin preocuparte, tus datos ya han
					sido guardados.
				</p>
			</DialogContent>
		</Dialog>
	)
}
