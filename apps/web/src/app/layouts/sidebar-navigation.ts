import {
	Building2,
	ClipboardList,
	Clock3,
	Download,
	Globe,
	KeyRound,
	LayoutDashboard,
	ListTree,
	type LucideIcon,
	Printer,
	ScanText,
	Settings,
	ShieldCheck,
	ShieldHalf,
	SlidersHorizontal,
	Store,
	Tags,
	UserRound,
	Users,
	Webhook,
} from 'lucide-react'

export type SidebarVisibility =
	| { type: 'always' }
	| { type: 'capability'; key: string }
	| { type: 'platform' }

export interface SidebarLink {
	kind: 'link'
	label: string
	href: string
	icon: LucideIcon
	visibility: SidebarVisibility
	exact?: boolean
}

export interface SidebarGroup {
	kind: 'group'
	label: string
	icon: LucideIcon
	visibility: SidebarVisibility
	items: SidebarLink[]
}

export interface SidebarComplaintsStores {
	kind: 'complaintsStores'
	label: string
	href: string
	icon: LucideIcon
	visibility: SidebarVisibility
}

export type SidebarEntry = SidebarLink | SidebarGroup | SidebarComplaintsStores

export interface SidebarVisibilityContext {
	capabilities?: Record<string, boolean>
	isPlatformAdmin: boolean
	hasOrganization: boolean
}

export interface SidebarAccountItem {
	label: string
	href: string
	icon: LucideIcon
	external?: boolean
}

export const sidebarNavigation: SidebarEntry[] = [
	{
		kind: 'link',
		label: 'Dashboard',
		href: '/dashboard',
		icon: LayoutDashboard,
		exact: true,
		visibility: { type: 'capability', key: 'dashboard.view' },
	},
	{
		kind: 'complaintsStores',
		label: 'Reclamos',
		href: '/dashboard/complaints',
		icon: ClipboardList,
		visibility: { type: 'capability', key: 'complaints.view' },
	},
	{
		kind: 'link',
		label: 'Tiendas',
		href: '/dashboard/stores',
		icon: Store,
		visibility: { type: 'capability', key: 'stores.view' },
	},
	{
		kind: 'link',
		label: 'Motivos',
		href: '/dashboard/reasons',
		icon: ListTree,
		visibility: { type: 'capability', key: 'reasons.view' },
	},
	{
		kind: 'link',
		label: 'Categorías',
		href: '/dashboard/categories',
		icon: Tags,
		visibility: { type: 'capability', key: 'categories.view' },
	},
	{
		kind: 'link',
		label: 'Exportar',
		href: '/dashboard/exports',
		icon: Download,
		visibility: { type: 'capability', key: 'exports.view' },
	},
	{
		kind: 'link',
		label: 'Auditoría',
		href: '/dashboard/audit',
		icon: Clock3,
		visibility: { type: 'capability', key: 'audit.view' },
	},
	{
		kind: 'group',
		label: 'Aviso',
		icon: Printer,
		visibility: { type: 'always' },
		items: [
			{
				kind: 'link',
				label: 'Sitio web',
				href: '/dashboard/notices/website',
				icon: Globe,
				visibility: { type: 'capability', key: 'notices.view' },
			},
			{
				kind: 'link',
				label: 'Imprimible',
				href: '/dashboard/notices/printable',
				icon: ScanText,
				visibility: { type: 'capability', key: 'printable.view' },
			},
		],
	},
	{
		kind: 'group',
		label: 'Administrar',
		icon: ShieldCheck,
		visibility: { type: 'always' },
		items: [
			{
				kind: 'link',
				label: 'Configuración',
				href: '/dashboard/settings',
				icon: Settings,
				visibility: { type: 'capability', key: 'settings.view' },
			},
			{
				kind: 'link',
				label: 'SSO',
				href: '/dashboard/sso',
				icon: KeyRound,
				visibility: { type: 'capability', key: 'admin' },
			},
			{
				kind: 'link',
				label: 'Webhooks',
				href: '/dashboard/webhooks',
				icon: Webhook,
				visibility: { type: 'capability', key: 'webhooks.view' },
			},
			{
				kind: 'link',
				label: 'Usuarios',
				href: '/dashboard/users',
				icon: Users,
				visibility: { type: 'capability', key: 'users.view' },
			},
		],
	},
	{
		kind: 'group',
		label: 'Plataforma',
		icon: ShieldHalf,
		visibility: { type: 'platform' },
		items: [
			{
				kind: 'link',
				label: 'Organizaciones',
				href: '/dashboard/platform',
				icon: Building2,
				exact: true,
				visibility: { type: 'platform' },
			},
			{
				kind: 'link',
				label: 'Ajustes',
				href: '/dashboard/admin-settings',
				icon: SlidersHorizontal,
				visibility: { type: 'platform' },
			},
		],
	},
]

export function getSidebarAccountItems(
	ssoAccountUrl: string | null = null,
): SidebarAccountItem[] {
	return ssoAccountUrl
		? [
				{
					label: 'Administrar cuenta',
					href: ssoAccountUrl,
					icon: UserRound,
					external: true,
				},
				{
					label: 'Claves API',
					href: '/dashboard/account',
					icon: KeyRound,
				},
			]
		: [
				{
					label: 'Administrar cuenta',
					href: '/dashboard/account',
					icon: UserRound,
				},
			]
}

export function isSidebarEntryVisible(
	visibility: SidebarVisibility,
	context: SidebarVisibilityContext,
): boolean {
	if (visibility.type === 'platform') {
		return context.isPlatformAdmin
	}
	if (visibility.type === 'always') {
		return true
	}
	// Solo presentación: sin capabilities del servidor no se infieren permisos por rol.
	return (
		context.hasOrganization &&
		context.capabilities?.[visibility.key] !== false
	)
}

export function isSidebarLinkActive(
	pathname: string,
	link: Pick<SidebarLink, 'href' | 'exact'>,
): boolean {
	return (
		pathname === link.href ||
		(!link.exact && pathname.startsWith(`${link.href}/`))
	)
}
