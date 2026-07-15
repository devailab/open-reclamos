import { eq } from 'drizzle-orm'
import type { NextPage } from 'next'
import { redirect } from 'next/navigation'
import { db } from '@/database/database'
import { users } from '@/database/schema'
import { getSession } from '@/lib/auth-server'
import { setActiveOrganizationCookie } from '@/modules/rbac/cookies'
import { getPendingOrganizationId } from '@/modules/rbac/queries'
import { SetupFlow } from '@/modules/setup/components/setup-flow'
import {
	getCountries,
	getOrganizationById,
	getUserOrganization,
	hasOrganizationStores,
} from '@/modules/setup/queries'

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

	// Usuarios con una organización creada pero sin tienda (flujo anterior o interrumpido)
	// retoman solo el paso de la tienda
	if (userData?.setupStatus === 'store') {
		const pendingOrganizationId = await getPendingOrganizationId(
			session.user.id,
		)
		const organization = pendingOrganizationId
			? await getOrganizationById(pendingOrganizationId)
			: await getUserOrganization(session.user.id)
		if (!organization) redirect('/login')

		// Si la organización ya tiene al menos una tienda (creada por otro flujo),
		// marcamos el setup como completo automáticamente
		if (await hasOrganizationStores(organization.id)) {
			await db
				.update(users)
				.set({ setupStatus: 'complete', pendingOrganizationId: null })
				.where(eq(users.id, session.user.id))
			await setActiveOrganizationCookie(organization.id)
			redirect('/dashboard')
		}

		return (
			<SetupFlow
				countries={countries}
				mode='setup'
				pendingOrganizationName={organization.name}
			/>
		)
	}

	return <SetupFlow countries={countries} mode='setup' />
}

export default SetupPage
