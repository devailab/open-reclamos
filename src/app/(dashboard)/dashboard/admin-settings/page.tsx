import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import type { FC } from 'react'
import { db } from '@/database/database'
import { users } from '@/database/schema'
import { getSession } from '@/lib/auth-server'
import { EmailTestCard } from '../settings/_features/email-test-card'

const AdminSettingsPage: FC = async () => {
	const session = await getSession()
	if (!session) redirect('/login')

	const [userData] = await db
		.select({ isSuperAdmin: users.isSuperAdmin })
		.from(users)
		.where(eq(users.id, session.user.id))
		.limit(1)

	if (!userData?.isSuperAdmin) redirect('/dashboard')

	return (
		<div className='space-y-6'>
			<div>
				<h1 className='text-2xl font-semibold'>Admin Plataforma</h1>
				<p className='mt-1 text-sm text-muted-foreground'>
					Configuración interna de la plataforma. Solo accesible para
					el super administrador.
				</p>
			</div>

			<EmailTestCard
				defaultRecipientEmail={session.user.email}
				canManage={true}
			/>
		</div>
	)
}

export default AdminSettingsPage
