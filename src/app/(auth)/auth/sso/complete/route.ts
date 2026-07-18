import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-server'
import { completeSsoSignIn } from '@/modules/auth/sso'

export async function GET(request: Request) {
	const session = await getSession()
	if (!session) {
		return NextResponse.redirect(new URL('/login?sso_error=1', request.url))
	}

	const destination = await completeSsoSignIn(session.user.id)
	return NextResponse.redirect(new URL(destination, request.url))
}
