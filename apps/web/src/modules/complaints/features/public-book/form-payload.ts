import type { UploadedFile } from './file-upload-area'
import type { Step1Values } from './step-consumer'
import type { Step2Values } from './step-details'

export function buildComplaintInput({
	organizationSlug,
	storeSlug,
	turnstileToken,
	consumer: step1Values,
	details: step2Values,
	files: uploadedFiles,
}: {
	organizationSlug: string
	storeSlug: string
	turnstileToken: string | null
	consumer: Step1Values
	details: Step2Values
	files: UploadedFile[]
}) {
	// Extraer el prefijo telefónico de la opción seleccionada.
	const dialCodeRaw = step1Values.dialCodeOption?.label ?? ''
	const dialCode = dialCodeRaw.match(/^\+(\d+)/)?.[0] ?? null

	const isJuridical = step1Values.personType === 'juridical'
	// Solo aplica a persona natural: evita enviar datos de tutor
	// residuales si el usuario cambió de tipo de persona
	const isMinor = !isJuridical && step1Values.isMinor

	const hasAmount =
		step2Values.complaintType === 'claim' && step2Values.claimsAmount

	const hasProof = hasAmount && step2Values.hasProofOfPayment

	return {
		organizationSlug,
		storeSlug,
		turnstileToken,
		personType: step1Values.personType,
		// Para jurídica: documentType/documentNumber = documento del representante o contacto
		// Para natural: documentType/documentNumber = documento de la persona
		documentType: isJuridical
			? (step1Values.contactDocumentType?.value ?? '')
			: (step1Values.documentType?.value ?? ''),
		documentNumber: isJuridical
			? (step1Values.contactDocumentNumber ?? '')
			: (step1Values.documentNumber ?? ''),
		// Para jurídica: firstName/lastName = datos del contacto/representante
		// Para natural: firstName/lastName = datos de la persona
		firstName: isJuridical
			? (step1Values.contactFirstName ?? '')
			: (step1Values.firstName ?? ''),
		lastName: isJuridical
			? (step1Values.contactLastName ?? '')
			: (step1Values.lastName ?? ''),
		legalName: isJuridical ? (step1Values.legalName ?? null) : null,
		// RUC de la empresa: el campo documentNumber del paso 1 en modo jurídico
		legalTaxId: isJuridical ? (step1Values.documentNumber ?? null) : null,
		isMinor,
		guardianFirstName: isMinor
			? (step1Values.guardianFirstName ?? null)
			: null,
		guardianLastName: isMinor
			? (step1Values.guardianLastName ?? null)
			: null,
		guardianDocumentType: isMinor
			? (step1Values.guardianDocumentType?.value ?? null)
			: null,
		guardianDocumentNumber: isMinor
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
		currency: hasAmount ? (step2Values.currency?.value ?? null) : null,
		amount:
			hasAmount && step2Values.amount !== null
				? String(step2Values.amount)
				: null,
		hasProofOfPayment: hasProof,
		proofOfPaymentType: hasProof
			? (step2Values.proofOfPaymentType?.value ?? null)
			: null,
		proofOfPaymentNumber: hasProof
			? (step2Values.proofOfPaymentNumber ?? null)
			: null,
		reasonId: step2Values.reasonOption?.value ?? null,
		incidentDate: step2Values.incidentDate ?? null,
		description: step2Values.description ?? null,
		request: step2Values.request ?? null,
		files: uploadedFiles
			.filter((f) => f.status === 'done')
			.map((f) => ({
				id: f.uploadId,
				token: f.token,
			})),
	}
}
