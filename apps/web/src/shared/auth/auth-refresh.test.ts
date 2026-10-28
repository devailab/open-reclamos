import { expect, test } from 'bun:test'
import { createAuthCoordinator } from './auth-refresh'

test('las solicitudes concurrentes comparten una sola renovación', async () => {
	let calls = 0
	let release = () => {}

	const gate = new Promise<void>((resolve) => {
		release = resolve
	})

	const auth = createAuthCoordinator(async () => {
		calls++
		await gate
	})

	const version = auth.version
	const requests = Array.from({ length: 20 }, () => auth.renew(version))

	await Promise.resolve()

	expect(calls).toBe(1)

	release()
	await Promise.all(requests)
	await auth.renew(version)

	expect(calls).toBe(1)
})

test('el cambio de empresa espera la renovación y no restaura el contexto anterior', async () => {
	const events: string[] = []
	let release = () => {}

	const gate = new Promise<void>((resolve) => {
		release = resolve
	})

	const auth = createAuthCoordinator(async () => {
		events.push('refresh')
		await gate
	})

	const version = auth.version
	const renewal = auth.renew(version)

	const switched = auth.changeContext(async () => {
		events.push('switch')
	})

	await Promise.resolve()

	expect(events).toEqual(['refresh'])

	release()
	await Promise.all([renewal, switched])
	await auth.renew(version)

	expect(events).toEqual(['refresh', 'switch'])
})

test('una renovación fallida libera la coordinación para iniciar sesión otra vez', async () => {
	const auth = createAuthCoordinator(async () => {
		throw new Error('Refresh vencido')
	})

	await expect(auth.renew()).rejects.toThrow('Refresh vencido')
	expect(await auth.changeContext(async () => 'login')).toBe('login')
})
