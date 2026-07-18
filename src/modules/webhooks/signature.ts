import crypto from 'node:crypto'

const SIGNATURE_PREFIX = 'sha256='

export const DEFAULT_SIGNATURE_TOLERANCE_SECONDS = 300

export function buildSignedContent(timestamp: number, rawBody: string): string {
	return `${timestamp}.${rawBody}`
}

export function signWebhookPayload(
	secret: string,
	timestamp: number,
	rawBody: string,
): string {
	return crypto
		.createHmac('sha256', secret)
		.update(buildSignedContent(timestamp, rawBody))
		.digest('hex')
}

export function buildSignatureHeader(signatureHex: string): string {
	return `${SIGNATURE_PREFIX}${signatureHex}`
}

export interface VerifyWebhookSignatureParams {
	secret: string
	rawBody: string
	timestampHeader: string
	signatureHeader: string
	toleranceSeconds?: number
	nowSeconds?: number
}

export function verifyWebhookSignature({
	secret,
	rawBody,
	timestampHeader,
	signatureHeader,
	toleranceSeconds = DEFAULT_SIGNATURE_TOLERANCE_SECONDS,
	nowSeconds = Math.floor(Date.now() / 1000),
}: VerifyWebhookSignatureParams): boolean {
	const timestamp = Number(timestampHeader)
	if (!Number.isFinite(timestamp)) return false
	if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false

	const expected = Buffer.from(
		buildSignatureHeader(signWebhookPayload(secret, timestamp, rawBody)),
	)
	const received = Buffer.from(signatureHeader)

	if (expected.length !== received.length) return false
	return crypto.timingSafeEqual(expected, received)
}
