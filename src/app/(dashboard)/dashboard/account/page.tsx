import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-server'
import { ChangePasswordForm } from './_features/change-password-form'
import { ProfileForm } from './_features/profile-form'

const AccountPage = async () => {
	const session = await getSession()
	if (!session) redirect('/login')

	return (
		<div className='space-y-6'>
			<div>
				<h1 className='text-2xl font-semibold'>Mi cuenta</h1>
				<p className='mt-1 text-sm text-muted-foreground'>
					Administra tu perfil y preferencias de cuenta.
				</p>
			</div>

			<div className='max-w-3xl space-y-6'>
				<ProfileForm user={session.user} />
				<ChangePasswordForm />
			</div>
		</div>
	)
}

export default AccountPage
