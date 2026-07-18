import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

function getEncryptionKey(): Buffer {
	const key = process.env.WEBHOOK_SECRET_ENCRYPTION_KEY
	if (!key) {
		throw new Error(
			'WEBHOOK_SECRET_ENCRYPTION_KEY no está configurada; no se puede cifrar/descifrar el secreto del webhook.',
		)
	}
	return crypto.createHash('sha256').update(key).digest()
}

export function encryptWebhookSecret(secret: string): string {
	const iv = crypto.randomBytes(IV_LENGTH)
	const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv)
	const ciphertext = Buffer.concat([
		cipher.update(secret, 'utf8'),
		cipher.final(),
	])
	const authTag = cipher.getAuthTag()

	return [iv, authTag, ciphertext].map((buf) => buf.toString('hex')).join(':')
}

export function decryptWebhookSecret(encrypted: string): string {
	const [ivHex, authTagHex, ciphertextHex] = encrypted.split(':')
	if (!ivHex || !authTagHex || !ciphertextHex) {
		throw new Error('Formato de secreto cifrado inválido.')
	}

	const decipher = crypto.createDecipheriv(
		ALGORITHM,
		getEncryptionKey(),
		Buffer.from(ivHex, 'hex'),
	)
	decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))

	return Buffer.concat([
		decipher.update(Buffer.from(ciphertextHex, 'hex')),
		decipher.final(),
	]).toString('utf8')
}
