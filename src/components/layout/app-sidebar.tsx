'use client'

import {
	BookOpen,
	Building2,
	ClipboardList,
	Clock3,
	LayoutDashboard,
	LogOut,
	Settings,
	Store,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
	{
		label: 'Organizaciones',
		href: '/dashboard/organizations',
		icon: Building2,
		exact: false,
	},
	{
		label: 'Motivos',
		href: '/dashboard/reasons',
		icon: BookOpen,
		exact: false,
	},
	{
		label: 'Configuración',
		href: '/dashboard/settings',
		icon: Settings,
		exact: false,
	},
]

export function AppSidebar() {
	const pathname = usePathname()

	return (
		<Sidebar collapsible='icon'>
			<SidebarHeader>
				<div className='flex items-center gap-2 px-2 py-1'>
					<div className='flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold'>
						OR
					</div>
					<span className='text-sm font-semibold truncate group-data-[collapsible=icon]:hidden'>
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
						<form action={$logoutAction}>
							<SidebarMenuButton
								type='submit'
								tooltip='Cerrar sesión'
							>
								<LogOut />
								<span>Cerrar sesión</span>
							</SidebarMenuButton>
						</form>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>

			<SidebarRail />
		</Sidebar>
	)
}
