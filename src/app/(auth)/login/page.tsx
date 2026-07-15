import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-server'
import {
	ALLOW_PUBLIC_REGISTRATION,
	SSO_ENABLED,
	SSO_PROVIDER_ID,
	SSO_PROVIDER_NAME,
} from '@/lib/config'
import { SsoLoginCard } from '@/modules/auth/components/sso-login-card'
import { hasAnyUser } from '@/modules/auth/queries'
import { LoginForm } from './_features/login-form'

interface LoginPageProps {
	searchParams: Promise<{ sso_error?: string }>
}

const LoginPage = async ({ searchParams }: LoginPageProps) => {
	const session = await getSession()
	if (session) {
		redirect('/dashboard')
	}
	if (SSO_ENABLED) {
		const { sso_error: ssoError } = await searchParams
		return (
			<SsoLoginCard
				providerId={SSO_PROVIDER_ID}
				providerName={SSO_PROVIDER_NAME}
				hasCallbackError={ssoError === '1'}
			/>
		)
	}

	const anyUser = await hasAnyUser()
	if (!anyUser) {
		redirect('/register')
	}

	return <LoginForm showRegisterLink={ALLOW_PUBLIC_REGISTRATION} />
}

export default LoginPage
