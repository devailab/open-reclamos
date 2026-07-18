export interface WebhookIdempotencyGuard {
	shouldProcess(webhookId: string, nowMs?: number): boolean
}

export function createWebhookIdempotencyGuard(
	ttlMs = 10 * 60 * 1000,
): WebhookIdempotencyGuard {
	const seenUntil = new Map<string, number>()

	return {
		shouldProcess(webhookId: string, nowMs = Date.now()): boolean {
			for (const [id, expiresAt] of seenUntil) {
				if (expiresAt <= nowMs) seenUntil.delete(id)
			}

			if (seenUntil.has(webhookId)) return false

			seenUntil.set(webhookId, nowMs + ttlMs)
			return true
		},
	}
}
