import { describe, expect, it } from 'bun:test'
import type { SubmitComplaintInput } from './actions'
import { validateSubmitComplaintInput } from './server-validation'

const VALID_UUID = '0198c3a1-0000-7000-8000-000000000001'
const VALID_TMP_KEY = `tmp/complaints/${VALID_UUID}/V1StGXR8_Z5jdHi6B-myT.jpg`

function buildValidInput(
	overrides: Partial<SubmitComplaintInput> = {},
): SubmitComplaintInput {
	return {
		organizationId: VALID_UUID,
		storeId: VALID_UUID,
		personType: 'natural',
		documentType: 'DNI',
		documentNumber: '12345678',
		firstName: 'Juan',
		lastName: 'Pérez',
		legalName: null,
		legalTaxId: null,
		isMinor: false,
		guardianFirstName: null,
		guardianLastName: null,
		guardianDocumentType: null,
		guardianDocumentNumber: null,
		email: 'juan@example.com',
		dialCode: '+51',
		phone: '987654321',
		ubigeoId: null,
		address: null,
		type: 'claim',
		itemType: 'product',
		itemDescription: 'Producto defectuoso',
		currency: 'PEN',
		amount: '150.50',
		hasProofOfPayment: false,
		proofOfPaymentType: null,
		proofOfPaymentNumber: null,
		reasonId: null,
		incidentDate: null,
		description: 'Descripción del problema',
		request: 'Devolución del dinero',
		files: [],
		turnstileToken: 'token',
		...overrides,
	}
}

describe('validateSubmitComplaintInput', () => {
	it('acepta un payload de persona natural válido', () => {
		expect(validateSubmitComplaintInput(buildValidInput())).toBeNull()
	})

	it('acepta un payload de persona jurídica válido con RUC', () => {
		const input = buildValidInput({
			personType: 'juridical',
			legalName: 'Mi Empresa S.A.C.',
			legalTaxId: '20552103816',
			documentType: 'DNI',
			documentNumber: '87654321',
		})
		expect(validateSubmitComplaintInput(input)).toBeNull()
	})

	it('rechaza organizationId no UUID', () => {
		const input = buildValidInput({ organizationId: 'not-a-uuid' })
		expect(validateSubmitComplaintInput(input)).not.toBeNull()
	})

	it('rechaza personType inválido', () => {
		const input = buildValidInput({ personType: 'other' })
		expect(validateSubmitComplaintInput(input)).not.toBeNull()
	})

	it('rechaza type de reclamo inválido', () => {
		const input = buildValidInput({ type: 'invalid' })
		expect(validateSubmitComplaintInput(input)).not.toBeNull()
	})

	it('rechaza persona jurídica sin RUC', () => {
		const input = buildValidInput({
			personType: 'juridical',
			legalName: 'Mi Empresa S.A.C.',
			legalTaxId: null,
		})
		expect(validateSubmitComplaintInput(input)).not.toBeNull()
	})

	it('rechaza RUC con formato incorrecto', () => {
		const input = buildValidInput({
			personType: 'juridical',
			legalName: 'Mi Empresa S.A.C.',
			legalTaxId: '123',
		})
		expect(validateSubmitComplaintInput(input)).not.toBeNull()
	})

	it('rechaza datos de empresa en persona natural', () => {
		const input = buildValidInput({ legalTaxId: '20552103816' })
		expect(validateSubmitComplaintInput(input)).not.toBeNull()
	})

	it('exige datos del tutor cuando es menor de edad', () => {
		const input = buildValidInput({ isMinor: true })
		expect(validateSubmitComplaintInput(input)).not.toBeNull()
	})

	it('acepta menor de edad con datos del tutor completos', () => {
		const input = buildValidInput({
			isMinor: true,
			guardianDocumentType: 'DNI',
			guardianDocumentNumber: '11223344',
			guardianFirstName: 'María',
			guardianLastName: 'López',
		})
		expect(validateSubmitComplaintInput(input)).toBeNull()
	})

	it('rechaza email inválido', () => {
		const input = buildValidInput({ email: 'no-es-email' })
		expect(validateSubmitComplaintInput(input)).not.toBeNull()
	})

	it('rechaza monto con formato inválido', () => {
		const input = buildValidInput({ amount: '12,50' })
		expect(validateSubmitComplaintInput(input)).not.toBeNull()
	})

	it('rechaza moneda desconocida', () => {
		const input = buildValidInput({ currency: 'EUR' })
		expect(validateSubmitComplaintInput(input)).not.toBeNull()
	})

	it('rechaza fecha de incidente futura', () => {
		const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
		const input = buildValidInput({ incidentDate: future })
		expect(validateSubmitComplaintInput(input)).not.toBeNull()
	})

	it('rechaza más archivos que el máximo permitido', () => {
		const file = {
			key: VALID_TMP_KEY,
			fileName: 'foto.jpg',
			contentType: 'image/jpeg',
		}
		const input = buildValidInput({ files: Array(6).fill(file) })
		expect(validateSubmitComplaintInput(input)).not.toBeNull()
	})

	it('rechaza claves de archivo fuera de tmp/complaints', () => {
		const input = buildValidInput({
			files: [
				{
					key: 'complaints/otro/archivo.jpg',
					fileName: 'foto.jpg',
					contentType: 'image/jpeg',
				},
			],
		})
		expect(validateSubmitComplaintInput(input)).not.toBeNull()
	})

	it('acepta archivos válidos dentro del límite', () => {
		const input = buildValidInput({
			files: [
				{
					key: VALID_TMP_KEY,
					fileName: 'foto.jpg',
					contentType: 'image/jpeg',
				},
			],
		})
		expect(validateSubmitComplaintInput(input)).toBeNull()
	})
})
