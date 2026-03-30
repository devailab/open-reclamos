'use client'

import { useState } from 'react'
import { useForm } from '@/hooks/use-form'
import { feedback } from '@/lib/feedback'
import { $submitComplaintAction } from '../actions'
import type { UploadedFile } from './file-upload-area'
import { STEP1_INITIAL, type Step1Values } from './step-consumer'
import { STEP2_INITIAL, type Step2Values } from './step-details'

type Step = 'consumer' | 'details'

interface SuccessData {
	trackingCode: string
	correlative: string
	responseDeadline: Date
}

interface UseComplaintFormParams {
	organizationId: string
	storeId: string | null // null = org mode, store not selected yet
}

export function useComplaintForm({
	organizationId,
	storeId: initialStoreId,
}: UseComplaintFormParams) {
	const [currentStep, setCurrentStep] = useState<Step>('consumer')
	const [selectedStoreId, setSelectedStoreId] = useState<string | null>(
		initialStoreId,
	)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [successData, setSuccessData] = useState<SuccessData | null>(null)
	const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

	// Step 1 form
	const [step1Values, setStep1Values] = useState<Step1Values>(STEP1_INITIAL)
	const step1Form = useForm({
		values: step1Values,
		setValues: setStep1Values,
		initialValues: STEP1_INITIAL,
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
		if (!selectedStoreId) {
			feedback.alert.error({ title: 'Selecciona una tienda primero.' })
			return
		}

		const stillUploading = uploadedFiles.some(
			(f) => f.status === 'uploading',
		)
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

		setIsSubmitting(true)

		try {
			// Extract dial code number from label like "+51 — Peru"
			const dialCodeRaw = step1Values.dialCodeOption?.label ?? ''
			const dialCode = dialCodeRaw.match(/^\+(\d+)/)?.[0] ?? null

			const isJuridical = step1Values.personType === 'juridical'

			const result = await $submitComplaintAction({
				organizationId,
				storeId: selectedStoreId,
				personType: step1Values.personType,
				// Para jurídica: documentType = RUC (empresa), documentNumber = RUC empresa
				// Para natural: documentType = tipo doc persona, documentNumber = número doc persona
				documentType: isJuridical
					? 'RUC'
					: (step1Values.documentType?.value ?? ''),
				documentNumber: step1Values.documentNumber ?? '',
				// Para jurídica: firstName/lastName = datos del contacto/representante
				// Para natural: firstName/lastName = datos de la persona
				firstName: isJuridical
					? (step1Values.contactFirstName ?? '')
					: (step1Values.firstName ?? ''),
				lastName: isJuridical
					? (step1Values.contactLastName ?? '')
					: (step1Values.lastName ?? ''),
				legalName: isJuridical ? (step1Values.legalName ?? null) : null,
				isMinor: !isJuridical && step1Values.isMinor,
				guardianFirstName: step1Values.isMinor
					? (step1Values.guardianFirstName ?? null)
					: null,
				guardianLastName: step1Values.isMinor
					? (step1Values.guardianLastName ?? null)
					: null,
				guardianDocumentType: step1Values.isMinor
					? (step1Values.guardianDocumentType?.value ?? null)
					: null,
				guardianDocumentNumber: step1Values.isMinor
					? (step1Values.guardianDocumentNumber ?? null)
					: null,
				email: step1Values.email ?? '',
				dialCode,
				phone: step1Values.phone ?? null,
				ubigeoId: step1Values.ubigeoOption?.value ?? null,
				address: step1Values.address ?? null,
				type: step2Values.complaintType ?? '',
				itemType:
					step2Values.complaintType === 'claim'
						? (step2Values.itemType ?? null)
						: null,
				itemDescription:
					step2Values.complaintType === 'claim'
						? (step2Values.itemDescription ?? null)
						: null,
				currency: step2Values.currency?.value ?? null,
				amount:
					step2Values.amount !== null
						? String(step2Values.amount)
						: null,
				hasProofOfPayment: step2Values.hasProofOfPayment,
				proofOfPaymentType: step2Values.hasProofOfPayment
					? (step2Values.proofOfPaymentType?.value ?? null)
					: null,
				proofOfPaymentNumber: step2Values.hasProofOfPayment
					? (step2Values.proofOfPaymentNumber ?? null)
					: null,
				reasonId: step2Values.reasonOption?.value ?? null,
				incidentDate: step2Values.incidentDate ?? null,
				description: step2Values.description ?? null,
				request: step2Values.request ?? null,
				files: uploadedFiles
					.filter((f) => f.status === 'done')
					.map((f) => ({
						key: f.key,
						fileName: f.fileName,
						contentType: f.contentType,
					})),
			})

			if (!result.success) {
				feedback.alert.error({
					title: 'Error al enviar el reclamo',
					description: result.error,
				})
				return
			}

			if (result.data) setSuccessData(result.data)
		} finally {
			setIsSubmitting(false)
		}
	}

	return {
		currentStep,
		goToStep,
		selectedStoreId,
		setSelectedStoreId,
		isSubmitting,
		successData,
		uploadedFiles,
		setUploadedFiles,
		step1Values,
		step1Register: step1Form.register,
		step2Values,
		step2Register: step2Form.register,
		handleSubmit,
	}
}
