import { OpListOrganizations, OpListStores } from '@open-reclamos/rpc-client'
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router'
import { listAll } from '@/shared/api/pagination'
import { type Organization, useSession } from '@/shared/auth/session'
import { ThemeToggle } from '@/shared/components/theme/theme-toggle'
import { Button } from '@/shared/components/ui/button'
import { Separator } from '@/shared/components/ui/separator'
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from '@/shared/components/ui/sidebar'
import { usePublicConfig } from '@/shared/config/public-config'
import type {
	StoreOption,
	UserOrganizationOption,
} from '../../modules/organizations/types'
import { AppSidebar } from './app-sidebar'

function organizationOption(
	organization: Organization,
): UserOrganizationOption {
	return {
		id: organization.id,
		name: organization.name,
		slug: organization.slug,
		role: organization.role,
		status: organization.status,
		logoKey: organization.logo_key ?? null,
		logoVersion: organization.updated_at ?? null,
	}
}

export function DashboardLayout() {
	const { session, tenantError } = useSession()
	const config = usePublicConfig()

	const [organizations, setOrganizations] = useState<
		UserOrganizationOption[]
	>([])

	const [stores, setStores] = useState<StoreOption[]>([])

	const [organizationsError, setOrganizationsError] = useState<Error | null>(
		null,
	)

	const [storesError, setStoresError] = useState<Error | null>(null)
	const [attempt, setAttempt] = useState(0)
	const organizationId = session?.organization_id

	// biome-ignore lint/correctness/useExhaustiveDependencies: attempt vuelve a cargar las opciones al reintentar sin cambiar el tenant.
	useEffect(() => {
		const controller = new AbortController()

		setOrganizationsError(null)
		setStoresError(null)
		setStores([])

		listAll<Organization>(OpListOrganizations, controller.signal)
			.then((rows) => {
				if (!controller.signal.aborted) {
					setOrganizations(rows.map(organizationOption))
				}
			})
			.catch((cause: Error) => {
				if (!controller.signal.aborted) {
					setOrganizationsError(cause)
				}
			})

		if (organizationId && !tenantError) {
			listAll<StoreOption>(OpListStores, controller.signal)
				.then((rows) => {
					if (!controller.signal.aborted) {
						setStores(rows)
					}
				})
				.catch((cause: Error) => {
					if (!controller.signal.aborted) {
						setStoresError(cause)
					}
				})
		}

		return () => controller.abort()
	}, [organizationId, tenantError, attempt])

	if (!session) {
		return null
	}

	const activeOrganization = session.organization
		? organizationOption(session.organization)
		: (organizations.find((item) => item.id === organizationId) ?? null)

	return (
		<SidebarProvider>
			<AppSidebar
				user={{
					...session.user,
					name: [session.user.name, session.user.last_name]
						.filter(Boolean)
						.join(' '),
				}}
				capabilities={session.capabilities}
				isPlatformAdmin={
					session.user.is_platform_admin &&
					session.auth_method === 'local'
				}
				organizations={organizations}
				activeOrganization={activeOrganization}
				complaintStores={stores}
			/>
			<SidebarInset>
				<header className='flex h-12 shrink-0 items-center gap-2 border-b px-4'>
					<SidebarTrigger className='-ml-1' />
					<Separator orientation='vertical' className='h-4' />
					<span className='text-sm text-muted-foreground'>
						{config?.appName ?? 'Open Reclamos'}
					</span>
					<div className='ml-auto'>
						<ThemeToggle />
					</div>
				</header>
				<div className='flex flex-1 flex-col p-4'>
					{organizationsError || storesError ? (
						<div role='alert' className='mb-4 space-y-2'>
							<p>
								{organizationsError
									? 'No se pudo cargar el selector de organizaciones.'
									: 'No se pudieron cargar las tiendas del menú.'}
							</p>
							<p>
								{(organizationsError ?? storesError)?.message}
							</p>
							<Button
								onClick={() => setAttempt((value) => value + 1)}
							>
								Reintentar
							</Button>
						</div>
					) : null}
					<Outlet />
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
