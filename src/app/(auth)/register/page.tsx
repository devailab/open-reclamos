import type { NextPage } from 'next'
import { ALLOW_PUBLIC_REGISTRATION } from '@/lib/config'
import { hasAnyUser } from '@/modules/auth/queries'
import { RegisterForm } from './_features/register-form'
import { RegistrationClosed } from './_features/registration-closed'

export const dynamic = 'force-dynamic'

const RegisterPage: NextPage = async () => {
	const anyUser = await hasAnyUser()
	const isFirstInstall = !anyUser

	if (!isFirstInstall && !ALLOW_PUBLIC_REGISTRATION) {
		return <RegistrationClosed />
	}

	return <RegisterForm isFirstUser={isFirstInstall} />
}

export default RegisterPage
