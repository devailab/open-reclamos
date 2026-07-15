import type { NextPage } from 'next'
import { redirect } from 'next/navigation'
import {
	ALLOW_PUBLIC_REGISTRATION,
	EMAIL_VERIFICATION_ENABLED,
	SSO_ENABLED,
} from '@/lib/config'
import { hasAnyUser } from '@/modules/auth/queries'
import { RegisterForm } from './_features/register-form'
import { RegistrationClosed } from './_features/registration-closed'

export const dynamic = 'force-dynamic'

const RegisterPage: NextPage = async () => {
	if (SSO_ENABLED) redirect('/login')

	const anyUser = await hasAnyUser()
	const isFirstInstall = !anyUser

	if (!isFirstInstall && !ALLOW_PUBLIC_REGISTRATION) {
		return <RegistrationClosed />
	}

	return (
		<RegisterForm
			isFirstUser={isFirstInstall}
			emailVerificationEnabled={EMAIL_VERIFICATION_ENABLED}
		/>
	)
}

export default RegisterPage
