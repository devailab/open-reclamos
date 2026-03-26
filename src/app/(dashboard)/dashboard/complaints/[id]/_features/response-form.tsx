'use client'

import { CheckCircle, Send } from 'lucide-react'
import { type FC, useState } from 'react'
import TextAreaField from '@/components/forms/textarea-field'
import { Button } from '@/components/ui/button'
import { useForm } from '@/hooks/use-form'
import { feedback } from '@/lib/feedback'
import { combine, minLength, required } from '@/lib/validators'
import { $respondToComplaintAction } from '@/modules/complaints/detail-actions'
import { sileo } from 'sileo'

interface ResponseFormValues {
	response: string | null
}

const INITIAL_VALUES: ResponseFormValues = {
	response: null,
}

const validateResponse = combine(
	required,
	minLength(20, 'La respuesta debe tener al menos 20 caracteres'),
)

interface ResponseFormProps {
	complaintId: string
	onSuccess: (response: string) => void
}

export const ResponseForm: FC<ResponseFormProps> = ({
	complaintId,
	onSuccess,
}) => {
	const [values, setValues] = useState<ResponseFormValues>(INITIAL_VALUES)
	const [isSubmitting, setIsSubmitting] = useState(false)

	const { register, validate } = useForm({
		values,
		setValues: (updater) => setValues((prev) => updater(prev)),
		initialValues: INITIAL_VALUES,
	})

	const handleSubmit = async () => {
		const errors = validate()
		if (errors.length > 0) return

		const confirmed = await feedback.confirm({
			title: 'Registrar respuesta oficial',
			description:
				'Una vez enviada, la respuesta no podrá ser editada y el reclamo pasará al estado Resuelto. ¿Deseas continuar?',
			confirmText: 'Sí, enviar respuesta',
			cancelText: 'Cancelar',
		})
		if (!confirmed) return

		setIsSubmitting(true)
		try {
			const result = await $respondToComplaintAction({
				id: complaintId,
				response: values.response ?? '',
			})

			if (!result.success) {
				sileo.error({
					title: 'Error al registrar respuesta',
					description: result.error ?? 'Por favor, intenta de nuevo.',
				})
				return
			}

			sileo.success({
				title: 'Respuesta registrada exitosamente',
				description:
					'El reclamo ha sido marcado como Resuelto y el consumidor puede ver la respuesta.',
			})
			onSuccess(values.response ?? '')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className='space-y-4'>
			<TextAreaField
				{...register('response')}
				label='Respuesta al consumidor'
				placeholder='Escribe aquí la respuesta oficial al consumidor...'
				rows={6}
				validate={validateResponse}
				disabled={isSubmitting}
			/>

			<div className='flex justify-end'>
				<Button
					onClick={handleSubmit}
					disabled={isSubmitting}
					className='gap-2'
				>
					<Send className='size-4' />
					{isSubmitting ? 'Enviando...' : 'Registrar respuesta'}
				</Button>
			</div>

			<p className='text-xs text-muted-foreground'>
				<CheckCircle className='inline size-3 mr-1' />
				Al enviar, el reclamo pasará al estado{' '}
				<strong>Resuelto</strong> y ya no podrá editarse la respuesta.
			</p>
		</div>
	)
}
