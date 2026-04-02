import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db } from '@/database/database'
import { users } from '@/database/schema'
import { getSession } from '@/lib/auth-server'
import { ApiKeySection } from './_features/api-key-section'
import { ChangePasswordForm } from './_features/change-password-form'
import { ProfileForm } from './_features/profile-form'

const AccountPage = async () => {
	const session = await getSession()
	if (!session) redirect('/login')

	const [userRow] = await db
		.select({
			apiKey: users.apiKey,
			apiKeyCreatedAt: users.apiKeyCreatedAt,
		})
		.from(users)
		.where(eq(users.id, session.user.id))
		.limit(1)

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
				<ApiKeySection
					hasApiKey={!!userRow?.apiKey}
					apiKeyCreatedAt={userRow?.apiKeyCreatedAt ?? null}
				/>
			</div>
		</div>
	)
}

export default AccountPage
