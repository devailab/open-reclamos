import { OpLogout } from '@open-reclamos/rpc-client'

;('use client')

import { ConnectError } from '@connectrpc/connect'
import {
	ChevronRight,
	ChevronsUpDown,
	ExternalLink,
	LogOut,
} from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { sileo } from 'sileo'
import {
	getSidebarAccountItems,
	isSidebarEntryVisible,
	isSidebarLinkActive,
	type SidebarGroup as SidebarGroupEntry,
	type SidebarLink,
	type SidebarVisibilityContext,
	sidebarNavigation,
} from '@/app/layouts/sidebar-navigation'
import { rpc } from '@/shared/api/rpc'
import { useSession } from '@/shared/auth/session'
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/shared/components/ui/collapsible'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarRail,
} from '@/shared/components/ui/sidebar'
import { switchOrganization } from '../../modules/organizations/api/navigation'
import { SidebarOrganizationSwitcher } from '../../modules/organizations/components/organization-switcher'
import type {
	StoreOption,
	UserOrganizationOption,
} from '../../modules/organizations/types'
import { SidebarComplaintsStores } from './sidebar-complaints-stores'

function getInitials(name: string): string {
	return name
		.split(' ')
		.slice(0, 2)
		.map((word) => word[0] ?? '')
		.join('')
		.toUpperCase()
}

function SidebarNavLink({
	item,
	pathname,
}: {
	item: SidebarLink
	pathname: string
}) {
	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				render={<Link to={item.href} />}
				isActive={isSidebarLinkActive(pathname, item)}
				tooltip={item.label}
			>
				<item.icon />
				<span>{item.label}</span>
			</SidebarMenuButton>
		</SidebarMenuItem>
	)
}

function SidebarNavGroup({
	group,
	pathname,
	context,
}: {
	group: SidebarGroupEntry
	pathname: string
	context: SidebarVisibilityContext
}) {
	const visibleItems = group.items.filter((item) =>
		isSidebarEntryVisible(item.visibility, context),
	)

	const isActive = visibleItems.some((item) =>
		isSidebarLinkActive(pathname, item),
	)

	const [isOpen, setIsOpen] = useState(isActive)

	useEffect(() => {
		if (isActive) {
			setIsOpen(true)
		}
	}, [isActive])

	if (visibleItems.length === 0) {
		return null
	}

	return (
		<SidebarMenuItem>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<CollapsibleTrigger
					render={
						<SidebarMenuButton tooltip={group.label}>
							<group.icon />
							<span>{group.label}</span>
							<ChevronRight className='ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90' />
						</SidebarMenuButton>
					}
				/>
				<CollapsibleContent>
					<SidebarMenuSub>
						{visibleItems.map((item) => (
							<SidebarMenuSubItem key={item.href}>
								<SidebarMenuSubButton
									render={<Link to={item.href} />}
									isActive={isSidebarLinkActive(
										pathname,
										item,
									)}
								>
									<item.icon />
									<span>{item.label}</span>
								</SidebarMenuSubButton>
							</SidebarMenuSubItem>
						))}
					</SidebarMenuSub>
				</CollapsibleContent>
			</Collapsible>
		</SidebarMenuItem>
	)
}

export interface AppSidebarProps {
	user: {
		name: string
		email: string
	}
	capabilities?: Record<string, boolean>
	isPlatformAdmin?: boolean
	organizations: UserOrganizationOption[]
	activeOrganization: UserOrganizationOption | null
	complaintStores?: StoreOption[]
}

export function AppSidebar({
	user,
	capabilities,
	isPlatformAdmin = false,
	organizations,
	activeOrganization,
	complaintStores = [],
}: AppSidebarProps) {
	const { pathname } = useLocation()
	const navigate = useNavigate()
	const { session, tenantError, refresh } = useSession()
	const [isPending, startTransition] = useTransition()

	const visibilityContext: SidebarVisibilityContext = {
		capabilities,
		isPlatformAdmin,
		hasOrganization: Boolean(activeOrganization),
	}

	const accountItems = getSidebarAccountItems()

	const handleLogout = () => {
		startTransition(async () => {
			try {
				await rpc(OpLogout, {})
				await refresh()
				navigate('/login', { replace: true })
			} catch (error) {
				sileo.error({
					title: 'No se pudo cerrar sesión',
					description: ConnectError.from(error).rawMessage,
				})
			}
		})
	}

	const handleOrganizationChange = (organizationId: string) => {
		if (
			!organizationId ||
			(organizationId === activeOrganization?.id && !tenantError) ||
			isPending
		) {
			return
		}

		const organization = organizations.find(
			(item) => item.id === organizationId,
		)

		if (!organization) {
			return
		}

		startTransition(async () => {
			try {
				const outcome = await switchOrganization(
					organization,
					session?.auth_method ?? 'local',
				)

				if (outcome.requiresSSO) {
					sileo.error({
						title: 'Se requiere acceso empresarial',
						description:
							'Inicia sesión nuevamente con el proveedor de esta empresa.',
					})

					navigate(outcome.destination)

					return
				}

				await refresh()
				// Los IDs de detalle y los filtros de la empresa anterior no se reutilizan.
				navigate(outcome.destination, { replace: true })
			} catch (error) {
				const failure = ConnectError.from(error)

				sileo.error({
					title: 'No se pudo cambiar de organización',
					description: failure.rawMessage,
				})
			}
		})
	}

	return (
		<Sidebar collapsible='icon'>
			<SidebarHeader>
				<SidebarOrganizationSwitcher
					organizations={organizations}
					activeOrganization={activeOrganization}
					isPending={isPending}
					allowActiveOrganizationRetry={Boolean(tenantError)}
					onOrganizationChange={handleOrganizationChange}
				/>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Menú principal</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{sidebarNavigation.map((entry) => {
								if (
									!isSidebarEntryVisible(
										entry.visibility,
										visibilityContext,
									)
								) {
									return null
								}

								if (entry.kind === 'link') {
									return (
										<SidebarNavLink
											key={entry.href}
											item={entry}
											pathname={pathname}
										/>
									)
								}

								if (entry.kind === 'complaintsStores') {
									return (
										<SidebarComplaintsStores
											key={entry.href}
											entry={entry}
											stores={complaintStores}
											pathname={pathname}
										/>
									)
								}

								return (
									<SidebarNavGroup
										key={entry.label}
										group={entry}
										pathname={pathname}
										context={visibilityContext}
									/>
								)
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<SidebarMenuButton
								render={<DropdownMenuTrigger />}
								size='lg'
								tooltip={user.name}
							>
								<Avatar size='sm'>
									<AvatarFallback>
										{getInitials(user.name)}
									</AvatarFallback>
								</Avatar>
								<div className='grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden'>
									<span className='truncate font-medium'>
										{user.name}
									</span>
									<span className='truncate text-xs text-muted-foreground'>
										{user.email}
									</span>
								</div>
								<ChevronsUpDown className='ml-auto size-4 shrink-0 opacity-50 group-data-[collapsible=icon]:hidden' />
							</SidebarMenuButton>

							<DropdownMenuContent
								side='top'
								align='start'
								className='min-w-56'
							>
								<div className='flex items-center gap-2 px-2.5 py-2'>
									<Avatar size='sm'>
										<AvatarFallback>
											{getInitials(user.name)}
										</AvatarFallback>
									</Avatar>
									<div className='grid min-w-0 flex-1 text-left text-sm leading-tight'>
										<span className='truncate font-semibold'>
											{user.name}
										</span>
										<span className='truncate text-xs text-muted-foreground'>
											{user.email}
										</span>
									</div>
								</div>

								<DropdownMenuSeparator />

								{accountItems.map((item) =>
									item.external ? (
										<DropdownMenuItem
											key={item.href}
											render={
												// biome-ignore lint/a11y/useAnchorContent: el contenido lo inyecta DropdownMenuItem vía render prop
												<a
													href={item.href}
													target='_blank'
													rel='noopener noreferrer'
												/>
											}
										>
											<item.icon />
											{item.label}
											<ExternalLink className='ml-auto size-3.5 opacity-60' />
										</DropdownMenuItem>
									) : (
										<DropdownMenuItem
											key={item.href}
											render={<Link to={item.href} />}
										>
											<item.icon />
											{item.label}
										</DropdownMenuItem>
									),
								)}

								<DropdownMenuSeparator />

								<DropdownMenuItem
									variant='destructive'
									disabled={isPending}
									onClick={handleLogout}
								>
									<LogOut />
									Cerrar sesión
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>

			<SidebarRail />
		</Sidebar>
	)
}
