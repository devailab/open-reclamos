'use client'

import {
	BookOpen,
	ChevronRight,
	ChevronsUpDown,
	ClipboardList,
	Clock3,
	KeyRound,
	LayoutDashboard,
	LogOut,
	Settings,
	ShieldCheck,
	Store,
	UserRound,
	Users,
	Webhook,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
import { $logoutAction } from '@/modules/auth/actions'

const navItems = [
	{
		label: 'Dashboard',
		href: '/dashboard',
		icon: LayoutDashboard,
		exact: true,
		permission: null, // visible para todos
	},
	{
		label: 'Reclamos',
		href: '/dashboard/complaints',
		icon: ClipboardList,
		exact: false,
		permission: 'complaints.view',
	},
	{
		label: 'Auditoría',
		href: '/dashboard/audit',
		icon: Clock3,
		exact: false,
		permission: 'audit.view',
	},
	{
		label: 'Tiendas',
		href: '/dashboard/stores',
		icon: Store,
		exact: false,
		permission: 'stores.view',
	},
	{
		label: 'Avisos',
		href: '/dashboard/notices',
		icon: BookOpen,
		exact: false,
		permission: 'notices.view',
	},
	{
		label: 'Motivos',
		href: '/dashboard/reasons',
		icon: BookOpen,
		exact: false,
		permission: 'reasons.view',
	},
	{
		label: 'Webhooks',
		href: '/dashboard/webhooks',
		icon: Webhook,
		exact: false,
		permission: 'webhooks.view',
	},
	{
		label: 'Configuración',
		href: '/dashboard/settings',
		icon: Settings,
		exact: false,
		permission: 'settings.view',
	},
]

const administrationItems = [
	{
		label: 'Usuarios',
		href: '/dashboard/users',
		icon: Users,
		permission: 'users.view',
	},
	{
		label: 'Roles',
		href: '/dashboard/roles',
		icon: ShieldCheck,
		permission: 'roles.view',
	},
	{
		label: 'Permisos',
		href: '/dashboard/permissions',
		icon: KeyRound,
		permission: 'permissions.view',
	},
]

function getInitials(name: string): string {
	return name
		.split(' ')
		.slice(0, 2)
		.map((w) => w[0] ?? '')
		.join('')
		.toUpperCase()
}

export interface AppSidebarProps {
	user: {
		name: string
		email: string
	}
	permissionKeys?: string[]
}

export function AppSidebar({ user, permissionKeys = [] }: AppSidebarProps) {
	const pathname = usePathname()
	const [isPending, startTransition] = useTransition()
	const visibleNavItems = navItems.filter(
		(item) =>
			item.permission === null ||
			permissionKeys.includes(item.permission),
	)
	const visibleAdministrationItems = administrationItems.filter((item) =>
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
		if (isAdministrationActive) setIsAdministrationOpen(true)
	}, [isAdministrationActive])

	const handleLogout = () => {
		startTransition(async () => {
			await $logoutAction()
		})
	}

	return (
		<Sidebar collapsible='icon'>
			<SidebarHeader>
				<div className='flex items-center gap-2 px-2 py-1'>
					<div className='flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold'>
						OR
					</div>
					<span className='truncate text-sm font-semibold group-data-[collapsible=icon]:hidden'>
						Open Reclamos
					</span>
				</div>
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
