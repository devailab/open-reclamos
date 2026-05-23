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

type Props = {
	searchParams: Promise<{ continued?: string }>
}

const SetupPage: NextPage<Props> = async ({ searchParams }) => {
	const session = await getSession()
	if (!session) {
		redirect('/login')
	}

	const { continued } = await searchParams
	const isDirectContinuation = continued === '1'

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
	const pendingOrganizationId = await getPendingOrganizationId(
		session.user.id,
	)

	// nos movemos al paso de configuración de la tienda, si el usuario ya completó el paso de organización
	if (userData?.setupStatus === 'store') {
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
				step='store'
				countries={countries}
				mode='setup'
				organizationName={isDirectContinuation ? undefined : organization.name}
			/>
		)
	}

	return <SetupFlow step='organization' countries={countries} mode='setup' />
}

export default SetupPage
