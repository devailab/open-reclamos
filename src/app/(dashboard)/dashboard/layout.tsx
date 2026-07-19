import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import type { FC, PropsWithChildren } from 'react'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Separator } from '@/components/ui/separator'
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from '@/components/ui/sidebar'
import { db } from '@/database/database'
import { users } from '@/database/schema'
import { getSession } from '@/lib/auth-server'
import { SSO_ACCOUNT_URL, SSO_ENABLED } from '@/lib/config'
import { getStoreOptionsForOrganization } from '@/modules/complaints/dashboard-queries'
import {
	getMembershipContext,
	getUserOrganizationOptions,
	hasPermission,
} from '@/modules/rbac/queries'

const AppLayout: FC<PropsWithChildren> = async ({ children }) => {
	const session = await getSession()
	if (!session) {
		redirect('/login')
	}

	const [userData] = await db
		.select({
			setupStatus: users.setupStatus,
			isSuperAdmin: users.isSuperAdmin,
		})
		.from(users)
		.where(eq(users.id, session.user.id))
		.limit(1)
	if (userData?.setupStatus !== 'complete') {
		redirect('/setup')
	}

	const [membership, organizations] = await Promise.all([
		getMembershipContext(session.user.id),
		getUserOrganizationOptions(session.user.id),
	])

	// Usuario retirado de todas sus organizaciones: pierde acceso al dashboard
	if (organizations.length === 0) {
		await db
			.update(users)
			.set({ setupStatus: 'organization', pendingOrganizationId: null })
			.where(eq(users.id, session.user.id))
		redirect('/setup')
	}

	const activeOrganization = organizations.find(
		(organization) => organization.id === membership?.organizationId,
	)

	const canViewComplaints = hasPermission(membership, 'complaints.view')
	const allowedStoreIds =
		membership?.storeAccessMode === 'selected'
			? membership.storeIds
			: undefined
	const complaintStores =
		membership && canViewComplaints
			? await getStoreOptionsForOrganization(
					membership.organizationId,
					allowedStoreIds,
				)
			: []

	return (
		<SidebarProvider>
			<AppSidebar
				user={{
					name: session.user.name,
					email: session.user.email,
				}}
				permissionKeys={membership?.permissionKeys ?? []}
				isSuperAdmin={userData?.isSuperAdmin ?? false}
				organizations={organizations}
				activeOrganization={activeOrganization ?? null}
				ssoAccountUrl={SSO_ENABLED ? SSO_ACCOUNT_URL || null : null}
				complaintStores={complaintStores}
			/>
			<SidebarInset>
				<header className='flex h-12 shrink-0 items-center gap-2 border-b px-4'>
					<SidebarTrigger className='-ml-1' />
					<Separator orientation='vertical' className='h-4' />
					<span className='text-sm text-muted-foreground'>
						Open Reclamos
					</span>
					<div className='ml-auto'>
						<ThemeToggle />
					</div>
				</header>
				<div className='flex flex-1 flex-col p-4'>{children}</div>
			</SidebarInset>
		</SidebarProvider>
	)
}

export default AppLayout
