import { describe, expect, it } from 'bun:test'
import {
	buildSignatureHeader,
	buildSignedContent,
	signWebhookPayload,
	verifyWebhookSignature,
} from './signature'

const SECRET = 'whsec_test_secret_value'
const RAW_BODY = JSON.stringify({ event: 'complaint.created', entityId: '1' })
const TIMESTAMP = 1_700_000_000

function sign(secret = SECRET, timestamp = TIMESTAMP, rawBody = RAW_BODY) {
	return buildSignatureHeader(signWebhookPayload(secret, timestamp, rawBody))
}

describe('signWebhookPayload / verifyWebhookSignature', () => {
	it('acepta una firma válida', () => {
		const valid = verifyWebhookSignature({
			secret: SECRET,
			rawBody: RAW_BODY,
			timestampHeader: String(TIMESTAMP),
			signatureHeader: sign(),
			nowSeconds: TIMESTAMP + 5,
		})

		expect(valid).toBe(true)
	})

	it('rechaza el payload modificado', () => {
		const valid = verifyWebhookSignature({
			secret: SECRET,
			rawBody: `${RAW_BODY}tampered`,
			timestampHeader: String(TIMESTAMP),
			signatureHeader: sign(),
			nowSeconds: TIMESTAMP + 5,
		})

		expect(valid).toBe(false)
	})

	it('rechaza el timestamp modificado', () => {
		const valid = verifyWebhookSignature({
			secret: SECRET,
			rawBody: RAW_BODY,
			timestampHeader: String(TIMESTAMP + 1),
			signatureHeader: sign(),
			nowSeconds: TIMESTAMP + 5,
		})

		expect(valid).toBe(false)
	})

	it('rechaza una firma incorrecta', () => {
		const valid = verifyWebhookSignature({
			secret: SECRET,
			rawBody: RAW_BODY,
			timestampHeader: String(TIMESTAMP),
			signatureHeader:
				'sha256=0000000000000000000000000000000000000000000000000000000000000000',
			nowSeconds: TIMESTAMP + 5,
		})

		expect(valid).toBe(false)
	})

	it('rechaza un timestamp expirado', () => {
		const valid = verifyWebhookSignature({
			secret: SECRET,
			rawBody: RAW_BODY,
			timestampHeader: String(TIMESTAMP),
			signatureHeader: sign(),
			nowSeconds: TIMESTAMP + 301,
		})

		expect(valid).toBe(false)
	})

	it('rechaza la firma anterior tras regenerar el secreto', () => {
		const oldSignature = sign(SECRET)
		const newSecret = 'whsec_rotated_secret_value'

		const valid = verifyWebhookSignature({
			secret: newSecret,
			rawBody: RAW_BODY,
			timestampHeader: String(TIMESTAMP),
			signatureHeader: oldSignature,
			nowSeconds: TIMESTAMP + 5,
		})

		expect(valid).toBe(false)

		const validWithNewSecret = verifyWebhookSignature({
			secret: newSecret,
			rawBody: RAW_BODY,
			timestampHeader: String(TIMESTAMP),
			signatureHeader: sign(newSecret),
			nowSeconds: TIMESTAMP + 5,
		})

		expect(validWithNewSecret).toBe(true)
	})

	it('produce una firma determinista para el mismo contenido serializado', () => {
		const first = signWebhookPayload(SECRET, TIMESTAMP, RAW_BODY)
		const second = signWebhookPayload(SECRET, TIMESTAMP, RAW_BODY)

		expect(first).toBe(second)
		expect(buildSignedContent(TIMESTAMP, RAW_BODY)).toBe(
			`${TIMESTAMP}.${RAW_BODY}`,
		)
	})
})
