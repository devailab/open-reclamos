import { expect, test } from 'bun:test'
import { createAccessTokenStore } from './access-token'

test('el access solo vive en el documento actual y se limpia al salir', () => {
	const store = createAccessTokenStore()

	store.set('access-jwt', Math.floor(Date.now() / 1000) + 600)

	expect(store.get()).toBe('access-jwt')
	expect(createAccessTokenStore().get()).toBe('')

	store.clear()

	expect(store.get()).toBe('')
})

test('rechaza un access sin duración válida', () => {
	for (const expiry of [
		0,
		Date.now() / 1000 - 1,
		Number.NaN,
		Number.POSITIVE_INFINITY,
	]) {
		expect(() => createAccessTokenStore().set('access', expiry)).toThrow()
	}
})
