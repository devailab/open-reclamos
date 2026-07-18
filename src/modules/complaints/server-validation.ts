// Validación de dominio del envío público de reclamos.
// Pura y sin 'use server' para poder testearla de forma aislada.

import {
	CURRENCY_OPTIONS,
	DOCUMENT_TYPE_OPTIONS,
	ITEM_TYPE_OPTIONS,
	PROOF_TYPE_OPTIONS,
} from '@/lib/constants'
import type { SubmitComplaintInput } from './actions'

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RUC_REGEX = /^\d{11}$/
const DIAL_CODE_REGEX = /^\+\d{1,4}$/
const AMOUNT_REGEX = /^\d{1,8}(\.\d{1,2})?$/
const TMP_KEY_REGEX =
	/^tmp\/complaints\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9_-]{21}\.[a-z0-9]{1,10}$/

export const MAX_COMPLAINT_FILES = 5

const ALLOWED_FILE_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'application/pdf',
])

const PERSON_TYPES = new Set(['natural', 'juridical'])
const COMPLAINT_TYPES = new Set(['claim', 'complaint'])
const DOCUMENT_TYPES = new Set(DOCUMENT_TYPE_OPTIONS.map((o) => o.value))
const ITEM_TYPES = new Set(ITEM_TYPE_OPTIONS.map((o) => o.value))
const CURRENCIES = new Set(CURRENCY_OPTIONS.map((o) => o.value))
const PROOF_TYPES = new Set(PROOF_TYPE_OPTIONS.map((o) => o.value))

const MAX_NAME_LENGTH = 120
const MAX_LEGAL_NAME_LENGTH = 200
const MAX_EMAIL_LENGTH = 254
const MAX_PHONE_LENGTH = 20
const MAX_ADDRESS_LENGTH = 300
const MAX_ITEM_DESCRIPTION_LENGTH = 1000
const MAX_PROOF_NUMBER_LENGTH = 50
const MAX_TEXT_LENGTH = 5000
const MAX_FILE_NAME_LENGTH = 255

function isDocumentNumberValid(value: string): boolean {
	const trimmed = value.trim()
	return trimmed.length >= 6 && trimmed.length <= 20
}

function isOptionalTextValid(value: string | null, maxLength: number): boolean {
	return value === null || value.length <= maxLength
}

/**
 * Valida integralmente el payload del Server Action público.
 * Retorna un mensaje de error o null si el input es válido.
 */
export function validateSubmitComplaintInput(
	input: SubmitComplaintInput,
): string | null {
	// Identificadores
	if (!UUID_REGEX.test(input.organizationId ?? '')) {
		return 'Datos de la organización no válidos.'
	}
	if (!UUID_REGEX.test(input.storeId ?? '')) {
		return 'Datos de la tienda no válidos.'
	}
	if (input.reasonId !== null && !UUID_REGEX.test(input.reasonId)) {
		return 'El motivo seleccionado no es válido.'
	}
	if (input.ubigeoId !== null && !UUID_REGEX.test(input.ubigeoId)) {
		return 'El distrito seleccionado no es válido.'
	}

	// Tipo de persona y de reclamo
	if (!PERSON_TYPES.has(input.personType)) {
		return 'El tipo de persona no es válido.'
	}
	if (!COMPLAINT_TYPES.has(input.type)) {
		return 'El tipo de reclamo no es válido.'
	}

	// Consumidor
	if (!DOCUMENT_TYPES.has(input.documentType)) {
		return 'El tipo de documento no es válido.'
	}
	if (!input.documentNumber || !isDocumentNumberValid(input.documentNumber)) {
		return 'El número de documento debe tener entre 6 y 20 caracteres.'
	}
	if (!input.firstName?.trim() || input.firstName.length > MAX_NAME_LENGTH) {
		return 'Los nombres son requeridos.'
	}
	if (!input.lastName?.trim() || input.lastName.length > MAX_NAME_LENGTH) {
		return 'Los apellidos son requeridos.'
	}

	// Persona jurídica
	if (input.personType === 'juridical') {
		if (
			!input.legalName?.trim() ||
			input.legalName.length > MAX_LEGAL_NAME_LENGTH
		) {
			return 'La razón social es requerida.'
		}
		if (!input.legalTaxId || !RUC_REGEX.test(input.legalTaxId.trim())) {
			return 'El RUC de la empresa debe tener 11 dígitos.'
		}
		if (input.isMinor) {
			return 'Una persona jurídica no puede ser menor de edad.'
		}
	} else {
		if (input.legalName !== null || input.legalTaxId !== null) {
			return 'Los datos de empresa solo aplican a una persona jurídica.'
		}
	}

	// Menor de edad: datos del tutor requeridos
	if (input.isMinor) {
		if (
			!input.guardianDocumentType ||
			!DOCUMENT_TYPES.has(input.guardianDocumentType)
		) {
			return 'El tipo de documento del tutor no es válido.'
		}
		if (
			!input.guardianDocumentNumber ||
			!isDocumentNumberValid(input.guardianDocumentNumber)
		) {
			return 'El número de documento del tutor debe tener entre 6 y 20 caracteres.'
		}
		if (
			!input.guardianFirstName?.trim() ||
			input.guardianFirstName.length > MAX_NAME_LENGTH
		) {
			return 'Los nombres del tutor son requeridos.'
		}
		if (
			!input.guardianLastName?.trim() ||
			input.guardianLastName.length > MAX_NAME_LENGTH
		) {
			return 'Los apellidos del tutor son requeridos.'
		}
	} else if (
		input.guardianFirstName !== null ||
		input.guardianLastName !== null ||
		input.guardianDocumentType !== null ||
		input.guardianDocumentNumber !== null
	) {
		return 'Los datos del tutor solo aplican a un menor de edad.'
	}

	// Contacto
	if (
		!input.email ||
		input.email.length > MAX_EMAIL_LENGTH ||
		!EMAIL_REGEX.test(input.email)
	) {
		return 'El correo electrónico no es válido.'
	}
	if (input.dialCode !== null && !DIAL_CODE_REGEX.test(input.dialCode)) {
		return 'El código de país no es válido.'
	}
	if (!isOptionalTextValid(input.phone, MAX_PHONE_LENGTH)) {
		return 'El teléfono no es válido.'
	}
	if (!isOptionalTextValid(input.address, MAX_ADDRESS_LENGTH)) {
		return 'La dirección es demasiado larga.'
	}

	// Detalle del reclamo
	if (input.itemType !== null && !ITEM_TYPES.has(input.itemType)) {
		return 'El tipo de bien no es válido.'
	}
	if (
		!isOptionalTextValid(input.itemDescription, MAX_ITEM_DESCRIPTION_LENGTH)
	) {
		return 'La descripción del bien es demasiado larga.'
	}
	if (input.currency !== null && !CURRENCIES.has(input.currency)) {
		return 'La moneda no es válida.'
	}
	if (input.amount !== null && !AMOUNT_REGEX.test(input.amount)) {
		return 'El monto no es válido.'
	}
	if (typeof input.hasProofOfPayment !== 'boolean') {
		return 'El indicador de comprobante no es válido.'
	}
	if (input.hasProofOfPayment) {
		if (
			input.proofOfPaymentType !== null &&
			!PROOF_TYPES.has(input.proofOfPaymentType)
		) {
			return 'El tipo de comprobante no es válido.'
		}
		if (
			!isOptionalTextValid(
				input.proofOfPaymentNumber,
				MAX_PROOF_NUMBER_LENGTH,
			)
		) {
			return 'El número de comprobante no es válido.'
		}
	} else if (
		input.proofOfPaymentType !== null ||
		input.proofOfPaymentNumber !== null
	) {
		return 'Los datos del comprobante solo aplican si tienes comprobante.'
	}

	if (input.incidentDate !== null) {
		const date = new Date(input.incidentDate)
		if (Number.isNaN(date.getTime())) {
			return 'La fecha del incidente no es válida.'
		}
		const now = Date.now()
		const oneDayMs = 24 * 60 * 60 * 1000
		if (date.getTime() > now + oneDayMs) {
			return 'La fecha del incidente no puede ser futura.'
		}
	}

	if (!isOptionalTextValid(input.description, MAX_TEXT_LENGTH)) {
		return 'La descripción del reclamo es demasiado larga.'
	}
	if (!isOptionalTextValid(input.request, MAX_TEXT_LENGTH)) {
		return 'El pedido del consumidor es demasiado largo.'
	}

	// Archivos adjuntos
	if (!Array.isArray(input.files)) {
		return 'Los archivos adjuntos no son válidos.'
	}
	if (input.files.length > MAX_COMPLAINT_FILES) {
		return `Solo se permiten hasta ${MAX_COMPLAINT_FILES} archivos adjuntos.`
	}
	for (const file of input.files) {
		if (typeof file?.key !== 'string' || !TMP_KEY_REGEX.test(file.key)) {
			return 'Uno de los archivos adjuntos no es válido.'
		}
		if (
			typeof file.fileName !== 'string' ||
			!file.fileName.trim() ||
			file.fileName.length > MAX_FILE_NAME_LENGTH
		) {
			return 'El nombre de uno de los archivos no es válido.'
		}
		if (!ALLOWED_FILE_TYPES.has(file.contentType)) {
			return 'El tipo de uno de los archivos no es válido.'
		}
	}

	return null
}
