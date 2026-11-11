import { Webhook } from 'lucide-react'
import { IcBuildings } from '@/shared/components/icons/ic-buildings'
import { IcCategory } from '@/shared/components/icons/ic-category'
import { IcClipboardText } from '@/shared/components/icons/ic-clipboard-text'
import { IcClock } from '@/shared/components/icons/ic-clock'
import { IcGlobal } from '@/shared/components/icons/ic-global'
import { IcHierarchy } from '@/shared/components/icons/ic-hierarchy'
import { IcImportArrow01 } from '@/shared/components/icons/ic-import-arrow-01'
import { IcKey } from '@/shared/components/icons/ic-key'
import { IcPeople } from '@/shared/components/icons/ic-people'
import { IcPrinter } from '@/shared/components/icons/ic-printer'
import { IcScan } from '@/shared/components/icons/ic-scan'
import { IcSetting2 } from '@/shared/components/icons/ic-setting-2'
import { IcSetting4 } from '@/shared/components/icons/ic-setting-4'
import { IcShieldSecurity } from '@/shared/components/icons/ic-shield-security'
import { IcShieldTick } from '@/shared/components/icons/ic-shield-tick'
import { IcShop } from '@/shared/components/icons/ic-shop'
import { IcTag } from '@/shared/components/icons/ic-tag'
import { IcUser } from '@/shared/components/icons/ic-user'
import type { IconComponent } from '@/shared/lib/render-icon'

export type SidebarVisibility =
	| { type: 'always' }
	| { type: 'capability'; key: string }
	| { type: 'platform' }

export interface SidebarLink {
	kind: 'link'
	label: string
	href: string
	icon: IconComponent
	iconSupportsSolid?: boolean
	visibility: SidebarVisibility
	exact?: boolean
}

export interface SidebarGroup {
	kind: 'group'
	label: string
	icon: IconComponent
	visibility: SidebarVisibility
	items: SidebarLink[]
}

export interface SidebarComplaintsStores {
	kind: 'complaintsStores'
	label: string
	href: string
	icon: IconComponent
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
	icon: IconComponent
	external?: boolean
}

export const sidebarNavigation: SidebarEntry[] = [
	{
		kind: 'link',
		label: 'Dashboard',
		href: '/dashboard',
		icon: IcCategory,
		exact: true,
		visibility: { type: 'capability', key: 'dashboard.view' },
	},
	{
		kind: 'complaintsStores',
		label: 'Reclamos',
		href: '/dashboard/complaints',
		icon: IcClipboardText,
		visibility: { type: 'capability', key: 'complaints.view' },
	},
	{
		kind: 'link',
		label: 'Tiendas',
		href: '/dashboard/stores',
		icon: IcShop,
		visibility: { type: 'capability', key: 'stores.view' },
	},
	{
		kind: 'link',
		label: 'Motivos',
		href: '/dashboard/reasons',
		icon: IcHierarchy,
		visibility: { type: 'capability', key: 'reasons.view' },
	},
	{
		kind: 'link',
		label: 'Categorías',
		href: '/dashboard/categories',
		icon: IcTag,
		visibility: { type: 'capability', key: 'categories.view' },
	},
	{
		kind: 'link',
		label: 'Exportar',
		href: '/dashboard/exports',
		icon: IcImportArrow01,
		visibility: { type: 'capability', key: 'exports.view' },
	},
	{
		kind: 'link',
		label: 'Auditoría',
		href: '/dashboard/audit',
		icon: IcClock,
		visibility: { type: 'capability', key: 'audit.view' },
	},
	{
		kind: 'group',
		label: 'Aviso',
		icon: IcPrinter,
		visibility: { type: 'always' },
		items: [
			{
				kind: 'link',
				label: 'Sitio web',
				href: '/dashboard/notices/website',
				icon: IcGlobal,
				visibility: { type: 'capability', key: 'notices.view' },
			},
			{
				kind: 'link',
				label: 'Imprimible',
				href: '/dashboard/notices/printable',
				icon: IcScan,
				visibility: { type: 'capability', key: 'printable.view' },
			},
		],
	},
	{
		kind: 'group',
		label: 'Administrar',
		icon: IcShieldTick,
		visibility: { type: 'always' },
		items: [
			{
				kind: 'link',
				label: 'Configuración',
				href: '/dashboard/settings',
				icon: IcSetting2,
				visibility: { type: 'capability', key: 'settings.view' },
			},
			{
				kind: 'link',
				label: 'SSO',
				href: '/dashboard/sso',
				icon: IcKey,
				visibility: { type: 'capability', key: 'admin' },
			},
			{
				kind: 'link',
				label: 'Webhooks',
				href: '/dashboard/webhooks',
				icon: Webhook,
				iconSupportsSolid: false,
				visibility: { type: 'capability', key: 'webhooks.view' },
			},
			{
				kind: 'link',
				label: 'Usuarios',
				href: '/dashboard/users',
				icon: IcPeople,
				visibility: { type: 'capability', key: 'users.view' },
			},
		],
	},
	{
		kind: 'group',
		label: 'Plataforma',
		icon: IcShieldSecurity,
		visibility: { type: 'platform' },
		items: [
			{
				kind: 'link',
				label: 'Organizaciones',
				href: '/dashboard/platform',
				icon: IcBuildings,
				exact: true,
				visibility: { type: 'platform' },
			},
			{
				kind: 'link',
				label: 'Ajustes',
				href: '/dashboard/admin-settings',
				icon: IcSetting4,
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
					icon: IcUser,
					external: true,
				},
				{
					label: 'Claves API',
					href: '/dashboard/account',
					icon: IcKey,
				},
			]
		: [
				{
					label: 'Administrar cuenta',
					href: '/dashboard/account',
					icon: IcUser,
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
