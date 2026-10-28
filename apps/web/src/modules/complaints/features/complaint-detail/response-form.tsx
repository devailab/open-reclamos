import { CheckCircle, CheckCircle2, Clock, Save, Send } from 'lucide-react'
import { type FC, useEffect, useMemo, useRef, useState } from 'react'
import { sileo } from 'sileo'
import SelectField, {
	type SelectOption,
} from '@/shared/components/forms/select-field'
import TextAreaField from '@/shared/components/forms/textarea-field'
import { Button } from '@/shared/components/ui/button'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useForm } from '@/shared/hooks/use-form'
import { feedback } from '@/shared/lib/feedback'
import {
	respondToComplaint,
	saveDraftResponse,
	updateComplaintClassification,
} from '../../api'
import type {
	ComplaintCategoryRow,
	ComplaintCategorySummary,
} from '../../types'
import { validateOfficialResponse } from '../../validation'
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

const validateSelect = (value: SelectOption | null) => {
	return value ? null : 'Este campo es requerido'
}

type DraftStatus = 'idle' | 'saving' | 'saved' | 'error'

interface ResponseFormProps {
	complaintId: string
	classificationOnly?: boolean
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
	classificationOnly = false,
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
	const previousInitialRef = useRef(initialValues)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [isSavingClassification, setIsSavingClassification] = useState(false)
	const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle')
	const isFirstRender = useRef(true)
	const lastSavedDraftRef = useRef((initialDraft ?? '').trim())
	const draftQueueRef = useRef(Promise.resolve())
	const submissionPendingRef = useRef(false)
	const mutationLockRef = useRef(false)

	useEffect(() => {
		lastSavedDraftRef.current = (initialDraft ?? '').trim()
	}, [initialDraft])

	// Adoptar datos nuevos solo en campos intactos; el refetch no descarta ediciones locales.
	useEffect(() => {
		const previous = previousInitialRef.current

		const next: ResponseFormValues = {
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

		setValues((current) => ({
			response:
				current.response === previous.response
					? next.response
					: current.response,
			priority:
				current.priority?.value === previous.priority?.value
					? next.priority
					: current.priority,
			category:
				current.category?.value === previous.category?.value
					? next.category
					: current.category,
		}))

		previousInitialRef.current = next
	}, [initialDraft, initialPriority, initialCategoryId, categoryOptions])

	const { register, validate } = useForm({
		values,
		setValues: (updater) => setValues((prev) => updater(prev)),
		initialValues,
	})

	const debouncedResponse = useDebounce(values.response, 1200)

	useEffect(() => {
		if (classificationOnly) {
			return
		}

		if (isFirstRender.current) {
			isFirstRender.current = false

			return
		}

		const draft = debouncedResponse?.trim() ?? ''

		if (draft === lastSavedDraftRef.current) {
			return
		}

		setDraftStatus('saving')

		let cancelled = false
		// Serializar borradores evita que una respuesta lenta sobrescriba texto más reciente.
		draftQueueRef.current = draftQueueRef.current.then(async () => {
			if (cancelled || submissionPendingRef.current) {
				return
			}

			const result = await saveDraftResponse(complaintId, draft)

			if (result.success) {
				lastSavedDraftRef.current = draft
			}
			if (!cancelled) {
				setDraftStatus(result.success ? 'saved' : 'error')
			}
		})

		return () => {
			cancelled = true
		}
	}, [debouncedResponse, complaintId, classificationOnly])

	const handleSaveClassification = async () => {
		if (mutationLockRef.current) {
			return
		}

		if (!values.priority) {
			sileo.error({
				title: 'Error al guardar clasificación',
				description: 'Debes seleccionar una prioridad.',
			})

			return
		}

		mutationLockRef.current = true
		setIsSavingClassification(true)

		try {
			const result = await updateComplaintClassification({
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
				onClassificationSaved({
					priority: values.priority?.value ?? 'medium',
					category:
						availableCategories.find(
							(category) =>
								category.id === values.category?.value,
						) ?? null,
				})
			}

			sileo.success({ title: 'Clasificación actualizada' })
		} finally {
			mutationLockRef.current = false
			setIsSavingClassification(false)
		}
	}

	const handleSubmit = async () => {
		if (mutationLockRef.current) {
			return
		}

		const errors = validate({ focus: 'first' })

		if (errors.length > 0) {
			return
		}

		mutationLockRef.current = true
		setIsSubmitting(true)

		try {
			const confirmed = await feedback.confirm({
				title: 'Registrar respuesta oficial',
				description:
					'Una vez enviada, la respuesta no podrá ser editada y el reclamo pasará al estado Resuelto. ¿Deseas continuar?',
				confirmText: 'Sí, enviar respuesta',
				cancelText: 'Cancelar',
			})

			if (!confirmed) {
				return
			}

			submissionPendingRef.current = true
			await draftQueueRef.current

			const priority = values.priority?.value ?? 'medium'

			const categoryId =
				values.category?.value === EMPTY_CATEGORY_VALUE
					? null
					: (values.category?.value ?? null)

			const response = values.response?.trim() ?? ''

			const result = await respondToComplaint({
				id: complaintId,
				response,
				priority,
				categoryId,
			})

			if (!result.success) {
				sileo.error({
					title: 'Error al registrar respuesta',
					description: result.error,
				})

				return
			}

			sileo.success({
				title: 'Respuesta registrada exitosamente',
				description:
					'El reclamo pasó a Resuelto. La respuesta en PDF está disponible para descargar; el correo se enviará si el servicio está habilitado.',
			})

			onSuccess({
				response,
				priority,
				category:
					availableCategories.find(
						(category) => category.id === categoryId,
					) ?? null,
			})
		} finally {
			submissionPendingRef.current = false
			mutationLockRef.current = false
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

			<div className='flex justify-end'>
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
			</div>

			{!classificationOnly && (
				<>
					<hr />

					<TextAreaField
						{...register('response')}
						label='Respuesta al consumidor'
						placeholder='Escribe aquí la respuesta oficial al consumidor...'
						rows={6}
						validate={validateOfficialResponse}
						disabled={isSubmitting}
					/>

					<div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
						<DraftIndicator status={draftStatus} />
						<Button
							onClick={handleSubmit}
							disabled={isSubmitting || isSavingClassification}
							className='gap-2 shrink-0 bg-green-600 text-white hover:bg-green-700'
						>
							<Send className='size-4' />
							{isSubmitting
								? 'Enviando...'
								: 'Registrar respuesta'}
						</Button>
					</div>

					<p className='text-xs text-muted-foreground'>
						<CheckCircle className='inline size-3 mr-1' />
						Al enviar, el reclamo pasará al estado{' '}
						<strong>Resuelto</strong> y ya no podrá editarse la
						respuesta.
					</p>
				</>
			)}
		</div>
	)
}

function DraftIndicator({ status }: { status: DraftStatus }) {
	if (status === 'idle') {
		return <div></div>
	}

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
