import {
	BookOpen,
	ClipboardList,
	Clock3,
	KeyRound,
	LayoutDashboard,
	ScanText,
	Settings,
	ShieldCheck,
	Store,
	Users,
	Webhook,
} from 'lucide-react'

export interface SidebarNavigationItem {
	label: string
	href: string
	icon: typeof LayoutDashboard
	exact?: boolean
	permission: string | null
}

export const sidebarNavItems: SidebarNavigationItem[] = [
	{
		label: 'Dashboard',
		href: '/dashboard',
		icon: LayoutDashboard,
		exact: true,
		permission: null,
	},
	{
		label: 'Reclamos',
		href: '/dashboard/complaints',
		icon: ClipboardList,
		permission: 'complaints.view',
	},
	{
		label: 'Auditoría',
		href: '/dashboard/audit',
		icon: Clock3,
		permission: 'audit.view',
	},
	{
		label: 'Tiendas',
		href: '/dashboard/stores',
		icon: Store,
		permission: 'stores.view',
	},
	{
		label: 'Motivos',
		href: '/dashboard/reasons',
		icon: BookOpen,
		permission: 'reasons.view',
	},
	{
		label: 'Webhooks',
		href: '/dashboard/webhooks',
		icon: Webhook,
		permission: 'webhooks.view',
	},
	{
		label: 'Configuración',
		href: '/dashboard/settings',
		icon: Settings,
		permission: 'settings.view',
	},
]

export const sidebarNoticesItems: SidebarNavigationItem[] = [
	{
		label: 'Sitio web',
		href: '/dashboard/notices/website',
		icon: BookOpen,
		permission: 'notices.view',
	},
	{
		label: 'Imprimible',
		href: '/dashboard/notices/printable',
		icon: ScanText,
		permission: 'printable.view',
	},
]

export const sidebarAdministrationItems: SidebarNavigationItem[] = [
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

const allNavigationItems = [
	...sidebarNavItems,
	...sidebarNoticesItems,
	...sidebarAdministrationItems,
]

function matchesPathname(pathname: string, href: string, exact = false) {
	return exact
		? pathname === href
		: pathname === href || pathname.startsWith(`${href}/`)
}

export function canAccessSidebarPathname(
	pathname: string,
	permissionKeys: string[],
): boolean {
	const matchedItem = allNavigationItems.find((item) =>
		matchesPathname(pathname, item.href, item.exact),
	)

	if (!matchedItem) {
		return true
	}

	return (
		matchedItem.permission === null ||
		permissionKeys.includes(matchedItem.permission)
	)
}
