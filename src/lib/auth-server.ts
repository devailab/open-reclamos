import { cookies, headers } from 'next/headers'
import { auth } from './auth'

export async function getSession() {
	const requestHeaders = new Headers(await headers())
	const cookieHeader = (await cookies()).toString()

	if (cookieHeader) {
		requestHeaders.set('cookie', cookieHeader)
	}

	return auth.api.getSession({
		headers: requestHeaders,
	})
}
