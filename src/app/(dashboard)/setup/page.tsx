import { eq } from 'drizzle-orm'
import type { NextPage } from 'next'
import { redirect } from 'next/navigation'
import { db } from '@/database/database'
import { users } from '@/database/schema'
import { getSession } from '@/lib/auth-server'
import { getCountries, getUserOrganization } from '@/modules/setup/queries'
import { SetupForm } from './_features/setup-form'

const SetupPage: NextPage = async () => {
	const session = await getSession()
	if (!session) {
		redirect('/login')
	}

	// Obtiene el usuario, para saber el estado actual de la configuración inicial
	const [userData] = await db
		.select({ setupStatus: users.setupStatus })
		.from(users)
		.where(eq(users.id, session.user.id))
		.limit(1)
	if (userData?.setupStatus === 'complete') {
		redirect('/dashboard')
	}

	const countries = await getCountries()

	// nos movemos al paso de configuración de la tienda, si el usuario ya completó el paso de organización
	if (userData?.setupStatus === 'store') {
		const organization = await getUserOrganization(session.user.id)
		if (!organization) redirect('/login')
		return (
			<SetupForm
				step='store'
				countries={countries}
				organizationId={organization.id}
			/>
		)
	}

	return <SetupForm step='organization' countries={countries} />
}

export default SetupPage
