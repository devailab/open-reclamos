import { useEffect, useRef, useState } from 'react'
import type { ComboboxOption } from '@/shared/components/forms/combobox-field'
import { useForm } from '@/shared/hooks/use-form'
import { feedback } from '@/shared/lib/feedback'
import { submitComplaint } from './api'
import type { UploadedFile } from './file-upload-area'
import { buildComplaintInput } from './form-payload'
import { createStep1Initial, type Step1Values } from './step-consumer'
import { STEP2_INITIAL, type Step2Values } from './step-details'

type Step = 'consumer' | 'details'

interface SuccessData {
	trackingCode: string
	correlative: string
	responseDeadline: Date
}

interface UseComplaintFormParams {
	organizationSlug: string
	storeId: string | null // null = org mode, store not selected yet
	defaultDialCodeOption: ComboboxOption | null
	stores: { id: string; slug: string }[]
	turnstileEnabled: boolean
	loading: boolean
}

export function useComplaintForm({
	organizationSlug,
	storeId: initialStoreId,
	defaultDialCodeOption,
	stores,
	turnstileEnabled,
	loading,
}: UseComplaintFormParams) {
	const [captchaRevision, setCaptchaRevision] = useState(0)

	const consumeCaptcha = () => {
		setTurnstileToken(null)
		setCaptchaRevision((value) => value + 1)
	}

	const [currentStep, setCurrentStep] = useState<Step>('consumer')

	const [selectedStoreId, setSelectedStoreId] = useState<string | null>(
		initialStoreId,
	)

	const storeInitialized = useRef(initialStoreId !== null)

	useEffect(() => {
		if (!storeInitialized.current && initialStoreId) {
			storeInitialized.current = true
			setSelectedStoreId(initialStoreId)
		}
	}, [initialStoreId])

	const submitLockRef = useRef(false)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [successData, setSuccessData] = useState<SuccessData | null>(null)
	const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
	const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
	const step1Initial = createStep1Initial(defaultDialCodeOption)

	// Step 1 form
	const [step1Values, setStep1Values] = useState<Step1Values>(step1Initial)
	const dialCodeInitialized = useRef(defaultDialCodeOption !== null)

	useEffect(() => {
		if (!dialCodeInitialized.current && defaultDialCodeOption) {
			dialCodeInitialized.current = true
			setStep1Values((current) => ({
				...current,
				dialCodeOption: current.dialCodeOption ?? defaultDialCodeOption,
			}))
		}
	}, [defaultDialCodeOption])

	const step1Form = useForm({
		values: step1Values,
		setValues: setStep1Values,
		initialValues: step1Initial,
	})

	// Step 2 form
	const [step2Values, setStep2Values] = useState<Step2Values>(STEP2_INITIAL)

	const step2Form = useForm({
		values: step2Values,
		setValues: setStep2Values,
		initialValues: STEP2_INITIAL,
	})

	const goToStep = (step: Step) => setCurrentStep(step)

	const handleSubmit = async () => {
		if (loading || submitLockRef.current || successData) {
			return
		}

		const selectedStore = stores.find(
			(store) => store.id === selectedStoreId,
		)

		if (!selectedStore) {
			feedback.alert.error({ title: 'Selecciona una tienda primero.' })

			return
		}

		const stillUploading = uploadedFiles.some(
			(f) => f.status === 'uploading',
		)

		if (uploadedFiles.some((file) => file.status === 'error')) {
			feedback.alert.error({
				title: 'Retira los archivos que no pudieron subirse antes de enviar.',
			})

			return
		}

		if (stillUploading) {
			feedback.alert.info({
				title: 'Espera a que terminen de subir los archivos.',
			})

			return
		}

		// Validate both steps (sets inline errors even on hidden step)
		const step1Errors = step1Form.validate({ focus: false })
		const step2Errors = step2Form.validate({ focus: false })

		if (step1Errors.length > 0) {
			if (currentStep !== 'consumer') {
				setCurrentStep('consumer')

				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						step1Form.validate({ focus: 'first' })
					})
				})
			} else {
				step1Form.validate({ focus: 'first' })
			}

			return
		}

		if (step2Errors.length > 0) {
			step2Form.validate({ focus: 'first' })

			return
		}

		if (!step2Values.confirmationCheck) {
			feedback.alert.error({
				title: 'Confirmación requerida',
				description:
					'Debes confirmar que la información ingresada es correcta antes de enviar.',
			})

			return
		}

		if (turnstileEnabled && !turnstileToken) {
			feedback.alert.error({
				title: 'Verificación de seguridad pendiente',
				description:
					'Completa el desafío de seguridad antes de enviar.',
			})

			return
		}

		submitLockRef.current = true
		setIsSubmitting(true)

		try {
			const result = await submitComplaint(
				buildComplaintInput({
					organizationSlug,
					storeSlug: selectedStore.slug,
					turnstileToken,
					consumer: step1Values,
					details: step2Values,
					files: uploadedFiles,
				}),
			)

			if (!result.success) {
				feedback.alert.error({
					title: 'Error al enviar el reclamo',
					description: result.error,
				})

				return
			}

			if (result.data) {
				setSuccessData(result.data)
			}
		} catch (error) {
			feedback.alert.error({
				title: 'Error al enviar el reclamo',
				description:
					error instanceof Error
						? error.message
						: 'Intenta nuevamente.',
			})
		} finally {
			if (turnstileEnabled) {
				consumeCaptcha()
			}

			submitLockRef.current = false
			setIsSubmitting(false)
		}
	}

	return {
		captchaRevision,
		consumeCaptcha,
		setStep1Values,
		currentStep,
		goToStep,
		selectedStoreId,
		setSelectedStoreId,
		isSubmitting,
		successData,
		uploadedFiles,
		setUploadedFiles,
		turnstileToken,
		setTurnstileToken,
		step1Values,
		step1Register: step1Form.register,
		step2Values,
		step2Register: step2Form.register,
		handleSubmit,
	}
}
