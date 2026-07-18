import { describe, expect, it } from 'bun:test'
import { createWebhookIdempotencyGuard } from './idempotency'

describe('createWebhookIdempotencyGuard', () => {
	it('permite procesar un identificador la primera vez', () => {
		const guard = createWebhookIdempotencyGuard()
		expect(guard.shouldProcess('evt_1')).toBe(true)
	})

	it('rechaza un identificador de evento duplicado', () => {
		const guard = createWebhookIdempotencyGuard()
		guard.shouldProcess('evt_1')

		expect(guard.shouldProcess('evt_1')).toBe(false)
	})

	it('vuelve a permitir el identificador tras expirar el TTL', () => {
		const guard = createWebhookIdempotencyGuard(1000)
		const start = 1_000_000

		guard.shouldProcess('evt_1', start)
		expect(guard.shouldProcess('evt_1', start + 1001)).toBe(true)
	})
})
