import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-server'
import { completeSsoSignIn } from '@/modules/auth/sso'

export default async function SsoCompletePage() {
	const session = await getSession()
	if (!session) redirect('/login?sso_error=1')

	redirect(await completeSsoSignIn(session.user.id))
}
