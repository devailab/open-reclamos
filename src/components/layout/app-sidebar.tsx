'use client'

import {
	BookOpen,
	ChevronRight,
	ChevronsUpDown,
	LogOut,
	Plus,
	ShieldCheck,
	UserRound,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { OrganizationLogo } from '@/components/organization-logo'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
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
	sidebarAdministrationItems,
	sidebarNavItems,
	sidebarNoticesItems,
} from '@/lib/sidebar-navigation'
import { $logoutAction } from '@/modules/auth/actions'
import { $switchOrganizationAction } from '@/modules/rbac/actions'
import type { UserOrganizationOption } from '@/modules/rbac/queries'

function getInitials(name: string): string {
	return name
		.split(' ')
		.slice(0, 2)
		.map((word) => word[0] ?? '')
		.join('')
		.toUpperCase()
}

export interface AppSidebarProps {
	user: {
		name: string
		email: string
	}
	permissionKeys?: string[]
	organizations: UserOrganizationOption[]
	activeOrganization: UserOrganizationOption | null
}

export function AppSidebar({
	user,
	permissionKeys = [],
	organizations,
	activeOrganization,
}: AppSidebarProps) {
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const [isPending, startTransition] = useTransition()
	const visibleNavItems = sidebarNavItems.filter(
		(item) =>
			item.permission === null ||
			permissionKeys.includes(item.permission),
	)
	const visibleNoticesItems = sidebarNoticesItems.filter(
		(item) =>
			item.permission !== null &&
			permissionKeys.includes(item.permission),
	)
	const isNoticesActive = visibleNoticesItems.some(
		(item) =>
			pathname === item.href || pathname.startsWith(`${item.href}/`),
	)
	const [isNoticesOpen, setIsNoticesOpen] = useState(isNoticesActive)

	const visibleAdministrationItems = sidebarAdministrationItems.filter(
		(item) =>
			item.permission !== null &&
			permissionKeys.includes(item.permission),
	)
	const isAdministrationActive = visibleAdministrationItems.some(
		(item) =>
			pathname === item.href || pathname.startsWith(`${item.href}/`),
	)
	const [isAdministrationOpen, setIsAdministrationOpen] = useState(
		isAdministrationActive,
	)

	useEffect(() => {
		if (isNoticesActive) setIsNoticesOpen(true)
	}, [isNoticesActive])

	useEffect(() => {
		if (isAdministrationActive) setIsAdministrationOpen(true)
	}, [isAdministrationActive])

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
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<button
								type='button'
								className='flex w-full items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-left transition-colors hover:bg-sidebar-accent'
							>
								{activeOrganization ? (
									<OrganizationLogo
										organizationId={activeOrganization.id}
										logoKey={activeOrganization.logoKey}
										name={activeOrganization.name}
										cacheKey={
											activeOrganization.logoVersion ??
											activeOrganization.logoKey ??
											undefined
										}
										className='size-10'
									/>
								) : (
									<div className='flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground' />
								)}
								<div className='min-w-0 flex-1 group-data-[collapsible=icon]:hidden'>
									<p className='truncate text-sm font-semibold'>
										{activeOrganization?.name ??
											'Open Reclamos'}
									</p>
									<p className='truncate text-xs text-muted-foreground'>
										Cambiar organización
									</p>
								</div>
								<ChevronsUpDown className='size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden' />
							</button>
						}
					/>
					<DropdownMenuContent
						align='start'
						side='bottom'
						className='w-80 p-0'
					>
						<DropdownMenuGroup className='p-2'>
							<DropdownMenuLabel>
								Organizaciones
							</DropdownMenuLabel>
							<DropdownMenuRadioGroup
								value={activeOrganization?.id ?? ''}
								onValueChange={handleOrganizationChange}
							>
								{organizations.map((organization) => (
									<DropdownMenuRadioItem
										key={organization.id}
										value={organization.id}
										disabled={isPending}
										className='px-2 py-2'
									>
										<OrganizationLogo
											organizationId={organization.id}
											logoKey={organization.logoKey}
											name={organization.name}
											cacheKey={
												organization.logoVersion ??
												organization.logoKey ??
												undefined
											}
											className='size-9'
										/>
										<span className='truncate'>
											{organization.name}
										</span>
									</DropdownMenuRadioItem>
								))}
							</DropdownMenuRadioGroup>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<div className='p-2'>
							<DropdownMenuItem
								render={
									<Link href='/dashboard/organizations/new' />
								}
								className='px-2 py-2 text-sm font-medium'
							>
								<div className='flex size-9 items-center justify-center rounded-lg border'>
									<Plus className='size-4' />
								</div>
								Agregar organización
							</DropdownMenuItem>
						</div>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Menú principal</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{visibleNavItems.map((item) => {
								const isActive = item.exact
									? pathname === item.href
									: pathname === item.href ||
										pathname.startsWith(`${item.href}/`)

								return (
									<SidebarMenuItem key={item.href}>
										<SidebarMenuButton
											render={<Link href={item.href} />}
											isActive={isActive}
											tooltip={item.label}
										>
											<item.icon />
											<span>{item.label}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								)
							})}

							{visibleNoticesItems.length > 0 && (
								<SidebarMenuItem>
									<Collapsible
										open={isNoticesOpen}
										onOpenChange={setIsNoticesOpen}
									>
										<CollapsibleTrigger
											render={
												<SidebarMenuButton tooltip='Aviso'>
													<BookOpen />
													<span>Aviso</span>
													<ChevronRight className='ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90' />
												</SidebarMenuButton>
											}
										/>
										<CollapsibleContent>
											<SidebarMenuSub>
												{visibleNoticesItems.map(
													(item) => {
														const isActive =
															pathname ===
																item.href ||
															pathname.startsWith(
																`${item.href}/`,
															)
														return (
															<SidebarMenuSubItem
																key={item.href}
															>
																<SidebarMenuSubButton
																	render={
																		<Link
																			href={
																				item.href
																			}
																		/>
																	}
																	isActive={
																		isActive
																	}
																>
																	<item.icon />
																	<span>
																		{
																			item.label
																		}
																	</span>
																</SidebarMenuSubButton>
															</SidebarMenuSubItem>
														)
													},
												)}
											</SidebarMenuSub>
										</CollapsibleContent>
									</Collapsible>
								</SidebarMenuItem>
							)}

							{visibleAdministrationItems.length > 0 && (
								<SidebarMenuItem>
									<Collapsible
										open={isAdministrationOpen}
										onOpenChange={setIsAdministrationOpen}
									>
										<CollapsibleTrigger
											render={
												<SidebarMenuButton tooltip='Administración'>
													<ShieldCheck />
													<span>Administración</span>
													<ChevronRight className='ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90' />
												</SidebarMenuButton>
											}
										/>
										<CollapsibleContent>
											<SidebarMenuSub>
												{visibleAdministrationItems.map(
													(item) => {
														const isActive =
															pathname ===
																item.href ||
															pathname.startsWith(
																`${item.href}/`,
															)
														return (
															<SidebarMenuSubItem
																key={item.href}
															>
																<SidebarMenuSubButton
																	render={
																		<Link
																			href={
																				item.href
																			}
																		/>
																	}
																	isActive={
																		isActive
																	}
																>
																	<item.icon />
																	<span>
																		{
																			item.label
																		}
																	</span>
																</SidebarMenuSubButton>
															</SidebarMenuSubItem>
														)
													},
												)}
											</SidebarMenuSub>
										</CollapsibleContent>
									</Collapsible>
								</SidebarMenuItem>
							)}
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

								<DropdownMenuItem
									render={<Link href='/dashboard/account' />}
								>
									<UserRound />
									Administrar cuenta
								</DropdownMenuItem>

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
