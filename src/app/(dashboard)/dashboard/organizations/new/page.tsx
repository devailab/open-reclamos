import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { db } from '@/database/database'
import { users } from '@/database/schema'
import { getSession } from '@/lib/auth-server'
import { getPendingOrganizationId } from '@/modules/rbac/queries'
import { SetupFlow } from '@/modules/setup/components/setup-flow'
import { getCountries } from '@/modules/setup/queries'

const NewOrganizationPage = async () => {
	const session = await getSession()
	if (!session) redirect('/login')

	const [userData] = await db
		.select({ setupStatus: users.setupStatus })
		.from(users)
		.where(eq(users.id, session.user.id))
		.limit(1)

	if (userData?.setupStatus !== 'complete') {
		redirect('/setup')
	}

	const countries = await getCountries()
	const pendingOrganizationId = await getPendingOrganizationId(
		session.user.id,
	)

	return (
		<SetupFlow
			step={pendingOrganizationId ? 'store' : 'organization'}
			countries={countries}
			mode='dashboard'
		/>
	)
}

export default NewOrganizationPage
