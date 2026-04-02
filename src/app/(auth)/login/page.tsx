import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-server'
import { LoginForm } from './_features/login-form'

const LoginPage = async () => {
	const session = await getSession()
	if (session) {
		redirect('/dashboard')
	}

	return <LoginForm />
}

export default LoginPage
