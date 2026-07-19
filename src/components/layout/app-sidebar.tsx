'use client'

import {
	ChevronRight,
	ChevronsUpDown,
	ExternalLink,
	LogOut,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
} from '@/components/ui/sidebar'
import {
	getSidebarAccountItems,
	isSidebarEntryVisible,
	isSidebarLinkActive,
	type SidebarGroup as SidebarGroupEntry,
	type SidebarLink,
	type SidebarVisibilityContext,
	sidebarNavigation,
} from '@/lib/sidebar-navigation'
import { $logoutAction } from '@/modules/auth/actions'
import type { StoreOption } from '@/modules/complaints/dashboard-queries'
import { $switchOrganizationAction } from '@/modules/rbac/actions'
import type { UserOrganizationOption } from '@/modules/rbac/queries'
import { SidebarComplaintsStores } from './sidebar-complaints-stores'
import { SidebarOrganizationSwitcher } from './sidebar-organization-switcher'

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
				render={<Link href={item.href} />}
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
		if (isActive) setIsOpen(true)
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
									render={<Link href={item.href} />}
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
	permissionKeys?: string[]
	isSuperAdmin?: boolean
	organizations: UserOrganizationOption[]
	activeOrganization: UserOrganizationOption | null
	ssoAccountUrl?: string | null
	complaintStores?: StoreOption[]
}

export function AppSidebar({
	user,
	permissionKeys = [],
	isSuperAdmin = false,
	organizations,
	activeOrganization,
	ssoAccountUrl = null,
	complaintStores = [],
}: AppSidebarProps) {
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const [isPending, startTransition] = useTransition()

	const visibilityContext: SidebarVisibilityContext = {
		permissionKeys,
		isSuperAdmin,
		isDevMode: process.env.NODE_ENV === 'development',
	}
	const accountItems = getSidebarAccountItems(ssoAccountUrl)

	const handleLogout = () => {
		startTransition(async () => {
			await $logoutAction()
		})
	}

	const handleOrganizationChange = (organizationId: string) => {
		if (!organizationId || organizationId === activeOrganization?.id) {
			return
		}

		const search = searchParams.toString()
		const currentPath = `${pathname ?? '/dashboard'}${
			search ? `?${search}` : ''
		}`

		startTransition(async () => {
			await $switchOrganizationAction(organizationId, currentPath)
		})
	}

	return (
		<Sidebar collapsible='icon'>
			<SidebarHeader>
				<SidebarOrganizationSwitcher
					organizations={organizations}
					activeOrganization={activeOrganization}
					isPending={isPending}
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
											render={<Link href={item.href} />}
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
