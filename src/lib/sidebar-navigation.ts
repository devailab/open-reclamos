import {
	Building2,
	ClipboardList,
	Clock3,
	Download,
	FileText,
	FlaskConical,
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
	Store,
	Tags,
	UserRound,
	Users,
	Webhook,
} from 'lucide-react'
import { COMPLAINTS_BASE_PATH } from '@/modules/complaints/routes'

export type SidebarVisibility =
	| { type: 'always' }
	| { type: 'permission'; key: string }
	| { type: 'superAdmin' }
	| { type: 'devMode' }

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
	permissionKeys: string[]
	isSuperAdmin: boolean
	isDevMode: boolean
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
		visibility: { type: 'always' },
	},
	{
		kind: 'complaintsStores',
		label: 'Reclamos',
		href: COMPLAINTS_BASE_PATH,
		icon: ClipboardList,
		visibility: { type: 'permission', key: 'complaints.view' },
	},
	{
		kind: 'link',
		label: 'Tiendas',
		href: '/dashboard/stores',
		icon: Store,
		visibility: { type: 'permission', key: 'stores.view' },
	},
	{
		kind: 'link',
		label: 'Motivos',
		href: '/dashboard/reasons',
		icon: ListTree,
		visibility: { type: 'permission', key: 'reasons.view' },
	},
	{
		kind: 'link',
		label: 'Categorías',
		href: '/dashboard/categories',
		icon: Tags,
		visibility: { type: 'permission', key: 'categories.view' },
	},
	{
		kind: 'link',
		label: 'Exportar',
		href: '/dashboard/exports',
		icon: Download,
		visibility: { type: 'permission', key: 'exports.view' },
	},
	{
		kind: 'link',
		label: 'Auditoría',
		href: '/dashboard/audit',
		icon: Clock3,
		visibility: { type: 'permission', key: 'audit.view' },
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
				visibility: { type: 'permission', key: 'notices.view' },
			},
			{
				kind: 'link',
				label: 'Imprimible',
				href: '/dashboard/notices/printable',
				icon: ScanText,
				visibility: { type: 'permission', key: 'printable.view' },
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
				visibility: { type: 'permission', key: 'settings.view' },
			},
			{
				kind: 'link',
				label: 'Webhooks',
				href: '/dashboard/webhooks',
				icon: Webhook,
				visibility: { type: 'permission', key: 'webhooks.view' },
			},
			{
				kind: 'link',
				label: 'Usuarios',
				href: '/dashboard/users',
				icon: Users,
				visibility: { type: 'permission', key: 'users.view' },
			},
			{
				kind: 'link',
				label: 'Roles',
				href: '/dashboard/roles',
				icon: ShieldCheck,
				visibility: { type: 'permission', key: 'roles.view' },
			},
			{
				kind: 'link',
				label: 'Permisos',
				href: '/dashboard/permissions',
				icon: KeyRound,
				visibility: { type: 'superAdmin' },
			},
			{
				kind: 'link',
				label: 'Plataforma',
				href: '/dashboard/platform',
				icon: Building2,
				visibility: { type: 'superAdmin' },
			},
			{
				kind: 'link',
				label: 'Ajustes plataforma',
				href: '/dashboard/admin-settings',
				icon: ShieldHalf,
				visibility: { type: 'superAdmin' },
			},
		],
	},
	{
		kind: 'group',
		label: 'Dev Tools',
		icon: FlaskConical,
		visibility: { type: 'devMode' },
		items: [
			{
				kind: 'link',
				label: 'Vista previa PDF',
				href: '/dashboard/dev/pdf-preview',
				icon: FileText,
				exact: true,
				visibility: { type: 'always' },
			},
		],
	},
]

export function getSidebarAccountItems(
	ssoAccountUrl: string | null,
): SidebarAccountItem[] {
	if (ssoAccountUrl) {
		return [
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
	}

	return [
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
	switch (visibility.type) {
		case 'always':
			return true
		case 'permission':
			return context.permissionKeys.includes(visibility.key)
		case 'superAdmin':
			return context.isSuperAdmin
		case 'devMode':
			return context.isDevMode
	}
}

export function isSidebarLinkActive(
	pathname: string,
	link: Pick<SidebarLink, 'href' | 'exact'>,
): boolean {
	return link.exact
		? pathname === link.href
		: pathname === link.href || pathname.startsWith(`${link.href}/`)
}

function toAccessCheckableLinks(entry: SidebarEntry): SidebarLink[] {
	if (entry.kind === 'group') {
		return entry.items
	}

	if (entry.kind === 'complaintsStores') {
		return [
			{
				kind: 'link',
				label: entry.label,
				href: entry.href,
				icon: entry.icon,
				visibility: entry.visibility,
			},
		]
	}

	return [entry]
}

const accessCheckableLinks: SidebarLink[] = sidebarNavigation
	.flatMap(toAccessCheckableLinks)
	.filter(
		(link) =>
			link.visibility.type === 'always' ||
			link.visibility.type === 'permission',
	)

export function canAccessSidebarPathname(
	pathname: string,
	permissionKeys: string[],
): boolean {
	const matchedLink = accessCheckableLinks.find((link) =>
		isSidebarLinkActive(pathname, link),
	)

	if (!matchedLink) {
		return true
	}

	if (matchedLink.visibility.type === 'always') {
		return true
	}

	return (
		matchedLink.visibility.type === 'permission' &&
		permissionKeys.includes(matchedLink.visibility.key)
	)
}
