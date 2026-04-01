import {
	MAX_RESPONSE_DEADLINE_DAYS,
	MIN_RESPONSE_DEADLINE_DAYS,
} from '@/lib/constants'
import { email, required } from '@/lib/validators'

export const validateOrgName = required
export const validateLegalName = required
export const validateUbigeo = required
export const validateAddressType = required
export const validateAddress = required

export interface UpdateOrganizationInput {
	name: string | null
	legalName: string | null
	ubigeoId: string | null
	addressType: string | null
	address: string | null
	phoneCode: string | null
	phone: string | null
	website: string | null
	formEnabled: boolean
	aiClassificationEnabled: boolean
	responseDeadlineDays: number | null
}

export function normalizeUpdateOrganizationInput(
	input: UpdateOrganizationInput,
) {
	return {
		name: input.name?.trim() ?? null,
		legalName: input.legalName?.trim() ?? null,
		ubigeoId: input.ubigeoId?.trim() ?? null,
		addressType: input.addressType?.trim() ?? null,
		address: input.address?.trim() ?? null,
		phoneCode: input.phoneCode?.trim() || null,
		phone: input.phone?.trim() || null,
		website: input.website?.trim() || null,
		formEnabled: input.formEnabled,
		aiClassificationEnabled: input.aiClassificationEnabled,
		responseDeadlineDays: Number.isFinite(input.responseDeadlineDays)
			? Math.trunc(input.responseDeadlineDays as number)
			: null,
	}
}

export function validateUpdateOrganizationInput(
	input: ReturnType<typeof normalizeUpdateOrganizationInput>,
): string | null {
	if (!input.name) return 'El nombre comercial es requerido'
	if (!input.legalName) return 'La razón social es requerida'
	if (!input.ubigeoId) return 'El distrito es requerido'
	if (!input.addressType) return 'El tipo de vía es requerido'
	if (!input.address) return 'La dirección es requerida'
	if (input.responseDeadlineDays === null) {
		return 'Debes indicar el plazo máximo de respuesta.'
	}
	if (input.responseDeadlineDays < MIN_RESPONSE_DEADLINE_DAYS) {
		return `El plazo máximo de respuesta debe ser de al menos ${MIN_RESPONSE_DEADLINE_DAYS} día.`
	}
	if (input.responseDeadlineDays > MAX_RESPONSE_DEADLINE_DAYS) {
		return `El plazo máximo de respuesta no puede superar los ${MAX_RESPONSE_DEADLINE_DAYS} días.`
	}
	return null
}

export interface SendTestEmailInput {
	recipientEmail: string | null
}

export function normalizeSendTestEmailInput(input: SendTestEmailInput) {
	return {
		recipientEmail: input.recipientEmail?.trim() ?? null,
	}
}

export function validateSendTestEmailInput(
	input: ReturnType<typeof normalizeSendTestEmailInput>,
): string | null {
	if (!input.recipientEmail) {
		return 'Debes indicar un correo de destino.'
	}

	return email(input.recipientEmail)
}
