import { beforeEach, describe, expect, it } from 'bun:test'
import { decryptWebhookSecret, encryptWebhookSecret } from './secret'

const SECRET = 'mi-secreto-configurado-por-la-empresa'

beforeEach(() => {
	process.env.WEBHOOK_SECRET_ENCRYPTION_KEY = 'test-encryption-key'
})

describe('encryptWebhookSecret / decryptWebhookSecret', () => {
	it('descifra al mismo valor original', () => {
		const encrypted = encryptWebhookSecret(SECRET)

		expect(encrypted).not.toBe(SECRET)
		expect(decryptWebhookSecret(encrypted)).toBe(SECRET)
	})

	it('produce un cifrado distinto cada vez (IV aleatorio)', () => {
		expect(encryptWebhookSecret(SECRET)).not.toBe(
			encryptWebhookSecret(SECRET),
		)
	})

	it('rechaza un texto cifrado manipulado', () => {
		const encrypted = encryptWebhookSecret(SECRET)
		const [iv, authTag, ciphertext] = encrypted.split(':')
		const tampered = `${iv}:${authTag}:${ciphertext.slice(0, -2)}00`

		expect(() => decryptWebhookSecret(tampered)).toThrow()
	})
})
