// Rate limiter simple en memoria por proceso. Suficiente para proteger
// acciones auxiliares de abuso básico; en despliegues con varias réplicas el
// límite efectivo es por instancia.

interface RateLimitEntry {
	count: number
	resetAt: number
}

const buckets = new Map<string, RateLimitEntry>()

export function checkRateLimit(
	key: string,
	maxRequests: number,
	windowMs: number,
): boolean {
	const now = Date.now()
	const entry = buckets.get(key)

	if (!entry || entry.resetAt < now) {
		buckets.set(key, { count: 1, resetAt: now + windowMs })
		return true
	}

	if (entry.count >= maxRequests) {
		return false
	}

	entry.count++
	return true
}
