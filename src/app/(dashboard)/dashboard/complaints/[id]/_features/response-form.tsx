'use client'

import { CheckCircle, CheckCircle2, Clock, Send } from 'lucide-react'
import { type FC, useEffect, useRef, useState } from 'react'
import { sileo } from 'sileo'
import TextAreaField from '@/components/forms/textarea-field'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/use-debounce'
import { useForm } from '@/hooks/use-form'
import { feedback } from '@/lib/feedback'
import { combine, minLength, required } from '@/lib/validators'
import {
	$respondToComplaintAction,
	$saveDraftResponseAction,
} from '@/modules/complaints/detail-actions'

interface ResponseFormValues {
	response: string | null
}

const validateResponse = combine(
	required,
	minLength(20, 'La respuesta debe tener al menos 20 caracteres'),
)

type DraftStatus = 'idle' | 'saving' | 'saved' | 'error'

interface ResponseFormProps {
	complaintId: string
	initialDraft?: string | null
	onSuccess: (result: {
		response: string
		respondedAt: string
		respondedByName: string | null
		publicNote: string
	}) => void
}

export const ResponseForm: FC<ResponseFormProps> = ({
	complaintId,
	initialDraft,
	onSuccess,
}) => {
	const initialValues: ResponseFormValues = { response: initialDraft ?? null }
	const [values, setValues] = useState<ResponseFormValues>(initialValues)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle')
	const isFirstRender = useRef(true)
	const lastSavedDraftRef = useRef((initialDraft ?? '').trim())

	const { register, validate } = useForm({
		values,
		setValues: (updater) => setValues((prev) => updater(prev)),
		initialValues,
	})

	const debouncedResponse = useDebounce(values.response, 1200)

	useEffect(() => {
		// Saltar el primer render: el valor ya viene del servidor
		if (isFirstRender.current) {
			isFirstRender.current = false
			return
		}

		const draft = debouncedResponse?.trim() ?? ''
		if (draft === lastSavedDraftRef.current) {
			return
		}

		setDraftStatus('saving')

		$saveDraftResponseAction(complaintId, draft).then((result) => {
			if (result.success) {
				lastSavedDraftRef.current = draft
				setDraftStatus('saved')
				return
			}

			setDraftStatus('error')
		})
	}, [debouncedResponse, complaintId])

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
					'El reclamo pasó a Resuelto y se envió el PDF de respuesta al correo del consumidor.',
			})
			if (result.data) {
				onSuccess(result.data)
			}
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

			<div className='flex items-center justify-between gap-3'>
				<DraftIndicator status={draftStatus} />
				<Button
					onClick={handleSubmit}
					disabled={isSubmitting}
					className='gap-2 shrink-0'
				>
					<Send className='size-4' />
					{isSubmitting ? 'Enviando...' : 'Registrar respuesta'}
				</Button>
			</div>

			<p className='text-xs text-muted-foreground'>
				<CheckCircle className='inline size-3 mr-1' />
				Al enviar, el reclamo pasará al estado <strong>Resuelto</strong>{' '}
				y ya no podrá editarse la respuesta.
			</p>
		</div>
	)
}

function DraftIndicator({ status }: { status: DraftStatus }) {
	if (status === 'idle') return <div></div>

	if (status === 'saving') {
		return (
			<span className='flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse'>
				<Clock className='size-3' />
				Guardando borrador…
			</span>
		)
	}

	if (status === 'saved') {
		return (
			<span className='flex items-center gap-1.5 text-xs text-green-600'>
				<CheckCircle2 className='size-3' />
				Borrador guardado
			</span>
		)
	}

	return (
		<span className='text-xs text-destructive'>
			No se pudo guardar el borrador
		</span>
	)
}
