import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-server'
import { ALLOW_PUBLIC_REGISTRATION } from '@/lib/config'
import { hasAnyUser } from '@/modules/auth/queries'
import { LoginForm } from './_features/login-form'

const LoginPage = async () => {
	const session = await getSession()
	if (session) {
		redirect('/dashboard')
	}

	const anyUser = await hasAnyUser()
	if (!anyUser) {
		redirect('/register')
	}

	return <LoginForm showRegisterLink={ALLOW_PUBLIC_REGISTRATION} />
}

export default LoginPage
