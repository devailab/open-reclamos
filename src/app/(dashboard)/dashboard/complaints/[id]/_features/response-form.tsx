'use client'

import { CheckCircle, CheckCircle2, Clock, Save, Send } from 'lucide-react'
import { type FC, useEffect, useMemo, useRef, useState } from 'react'
import { sileo } from 'sileo'
import SelectField, { type SelectOption } from '@/components/forms/select-field'
import TextAreaField from '@/components/forms/textarea-field'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/use-debounce'
import { useForm } from '@/hooks/use-form'
import { feedback } from '@/lib/feedback'
import { combine, minLength, required } from '@/lib/validators'
import type { ComplaintCategoryRow } from '@/modules/categories/queries'
import {
	$respondToComplaintAction,
	$saveDraftResponseAction,
	$updateComplaintClassificationAction,
} from '@/modules/complaints/detail-actions'
import type { ComplaintCategorySummary } from '@/modules/complaints/detail-queries'
import { COMPLAINT_PRIORITY_LABEL } from './shared'

interface ResponseFormValues {
	response: string | null
	priority: SelectOption | null
	category: SelectOption | null
}

const PRIORITY_OPTIONS: SelectOption[] = [
	{ value: 'low', label: COMPLAINT_PRIORITY_LABEL.low },
	{ value: 'medium', label: COMPLAINT_PRIORITY_LABEL.medium },
	{ value: 'high', label: COMPLAINT_PRIORITY_LABEL.high },
	{ value: 'urgent', label: COMPLAINT_PRIORITY_LABEL.urgent },
]
const EMPTY_CATEGORY_VALUE = '__none__'

const validateResponse = combine(
	required,
	minLength(20, 'La respuesta debe tener al menos 20 caracteres'),
)

const validateSelect = (value: SelectOption | null) => {
	return value ? null : 'Este campo es requerido'
}

type DraftStatus = 'idle' | 'saving' | 'saved' | 'error'

interface ResponseFormProps {
	complaintId: string
	initialDraft?: string | null
	initialPriority: string
	initialCategoryId: string | null
	availableCategories: Pick<
		ComplaintCategoryRow,
		'id' | 'name' | 'description'
	>[]
	onClassificationSaved: (result: {
		priority: string
		category: ComplaintCategorySummary | null
	}) => void
	onSuccess: (result: {
		response: string
		respondedAt: string
		respondedByName: string | null
		publicNote: string
		priority: string
		category: ComplaintCategorySummary | null
	}) => void
}

function toCategoryOption(
	category: Pick<ComplaintCategoryRow, 'id' | 'name'>,
): SelectOption {
	return {
		value: category.id,
		label: category.name,
	}
}

export const ResponseForm: FC<ResponseFormProps> = ({
	complaintId,
	initialDraft,
	initialPriority,
	initialCategoryId,
	availableCategories,
	onClassificationSaved,
	onSuccess,
}) => {
	const categoryOptions = useMemo(
		() => [
			{ value: EMPTY_CATEGORY_VALUE, label: 'Sin categoría' },
			...availableCategories.map(toCategoryOption),
		],
		[availableCategories],
	)
	const initialValues: ResponseFormValues = {
		response: initialDraft ?? null,
		priority:
			PRIORITY_OPTIONS.find(
				(option) => option.value === initialPriority,
			) ?? PRIORITY_OPTIONS[1],
		category:
			categoryOptions.find(
				(option) => option.value === initialCategoryId,
			) ?? categoryOptions[0],
	}
	const [values, setValues] = useState<ResponseFormValues>(initialValues)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [isSavingClassification, setIsSavingClassification] = useState(false)
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

	const handleSaveClassification = async () => {
		if (!values.priority) {
			sileo.error({
				title: 'Error al guardar clasificación',
				description: 'Debes seleccionar una prioridad.',
			})
			return
		}

		setIsSavingClassification(true)
		try {
			const result = await $updateComplaintClassificationAction({
				id: complaintId,
				priority: (values.priority?.value ?? 'medium') as
					| 'low'
					| 'medium'
					| 'high'
					| 'urgent',
				categoryId:
					values.category?.value === EMPTY_CATEGORY_VALUE
						? null
						: (values.category?.value ?? null),
			})

			if (!result.success) {
				sileo.error({
					title: 'Error al guardar clasificación',
					description: result.error ?? 'Por favor, intenta de nuevo.',
				})
				return
			}

			if (result.data) {
				onClassificationSaved(result.data)
			}
			sileo.success({ title: 'Clasificación actualizada' })
		} finally {
			setIsSavingClassification(false)
		}
	}

	const handleSubmit = async () => {
		const errors = validate({ focus: 'first' })
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
				priority: (values.priority?.value ?? 'medium') as
					| 'low'
					| 'medium'
					| 'high'
					| 'urgent',
				categoryId:
					values.category?.value === EMPTY_CATEGORY_VALUE
						? null
						: (values.category?.value ?? null),
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
					'El reclamo pasó a Resuelto y el envío del PDF de respuesta quedó en cola para procesarse.',
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
			<div className='grid gap-4 md:grid-cols-2'>
				<SelectField
					{...register('priority')}
					label='Prioridad'
					options={PRIORITY_OPTIONS}
					validate={validateSelect}
					disabled={isSubmitting || isSavingClassification}
				/>
				<SelectField
					{...register('category')}
					label='Categoría'
					options={categoryOptions}
					placeholder='Sin categoría'
					disabled={isSubmitting || isSavingClassification}
				/>
			</div>

			<TextAreaField
				{...register('response')}
				label='Respuesta al consumidor'
				placeholder='Escribe aquí la respuesta oficial al consumidor...'
				rows={6}
				validate={validateResponse}
				disabled={isSubmitting}
			/>

			<div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
				<DraftIndicator status={draftStatus} />
				<div className='flex flex-col gap-2 sm:flex-row'>
					<Button
						variant='outline'
						onClick={handleSaveClassification}
						disabled={isSubmitting || isSavingClassification}
						className='gap-2'
					>
						<Save className='size-4' />
						{isSavingClassification
							? 'Guardando...'
							: 'Guardar clasificación'}
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={isSubmitting}
						className='gap-2 shrink-0 bg-green-600 text-white hover:bg-green-700'
					>
						<Send className='size-4' />
						{isSubmitting ? 'Enviando...' : 'Registrar respuesta'}
					</Button>
				</div>
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
