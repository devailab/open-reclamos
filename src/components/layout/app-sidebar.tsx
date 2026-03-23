'use client'

import {
	BookOpen,
	ChevronsUpDown,
	ClipboardList,
	Clock3,
	LayoutDashboard,
	LogOut,
	Store,
	UserRound,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
	SidebarRail,
} from '@/components/ui/sidebar'
import { $logoutAction } from '@/modules/auth/actions'

const navItems = [
	{
		label: 'Dashboard',
		href: '/dashboard',
		icon: LayoutDashboard,
		exact: true,
	},
	{
		label: 'Reclamos',
		href: '/dashboard/complaints',
		icon: ClipboardList,
		exact: false,
	},
	{
		label: 'Auditoría',
		href: '/dashboard/audit',
		icon: Clock3,
		exact: false,
	},
	{
		label: 'Tiendas',
		href: '/dashboard/stores',
		icon: Store,
		exact: false,
	},
	// { label: 'Organizaciones', href: '/dashboard/organizations', icon: Building2, exact: false },
	{
		label: 'Motivos',
		href: '/dashboard/reasons',
		icon: BookOpen,
		exact: false,
	},
	// { label: 'Configuración', href: '/dashboard/settings', icon: Settings, exact: false },
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
}

export function AppSidebar({ user }: AppSidebarProps) {
	const pathname = usePathname()
	const [isPending, startTransition] = useTransition()

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
							{navItems.map((item) => {
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
