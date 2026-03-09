import { headers } from 'next/headers'
import { cache } from 'react'
import { auth } from './auth'

/**
 * Obtiene la sesión del usuario actual.
 * Usa React.cache para deduplicar llamadas dentro del mismo request,
 * evitando múltiples consultas a la base de datos desde layout y page.
 */
export const getSession = cache(async () => {
	return auth.api.getSession({
		headers: await headers(),
	})
})
