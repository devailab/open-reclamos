import type { RouteObject } from 'react-router'
import { AuthLayout } from './layouts/auth-layout'
import { TenantDashboardLayout } from './layouts/tenant-dashboard-layout'
import { LoginReady, RegisterReady } from './routing/auth-gates'
import { DataRouteErrorBoundary, NotFoundPage } from './routing/route-feedback'
import {
	RequireOrganization,
	RequirePlatformAdmin,
	RequireSession,
} from './routing/session-guards'

// Cada pantalla vive en `app/pages`, en una carpeta que refleja su URL.
const children: RouteObject[] = [
	{ path: '/', lazy: () => import('./pages/page') },
	{
		Component: AuthLayout,
		children: [
			{
				Component: LoginReady,
				children: [
					{
						path: '/login',
						lazy: () => import('./pages/login/page'),
					},
					{
						path: '/login/:organizationSlug',
						lazy: () =>
							import('./pages/login/[organizationSlug]/page'),
					},
				],
			},
			{
				Component: RegisterReady,
				children: [
					{
						path: '/register',
						lazy: () => import('./pages/register/page'),
					},
				],
			},
			{ path: '/install', lazy: () => import('./pages/install/page') },
			{ path: '/status', lazy: () => import('./pages/status/page') },
			{
				path: '/invite/:token',
				lazy: () => import('./pages/invite/[token]/page'),
			},
		],
	},
	{ path: '/c/:slug', lazy: () => import('./pages/c/[slug]/page') },
	{ path: '/s/:slug', lazy: () => import('./pages/s/[slug]/page') },
	{
		Component: RequireSession,
		children: [
			{ path: '/setup', lazy: () => import('./pages/setup/page') },
			{
				path: '/dashboard',
				Component: TenantDashboardLayout,
				children: [
					{
						path: 'account',
						lazy: () => import('./pages/dashboard/account/page'),
					},
					{
						path: 'organizations/new',
						lazy: () =>
							import('./pages/dashboard/organizations/new/page'),
					},
					{
						Component: RequireOrganization,
						children: [
							{
								index: true,
								lazy: () => import('./pages/dashboard/page'),
							},
							{
								path: 'complaints',
								lazy: () =>
									import('./pages/dashboard/complaints/page'),
							},
							{
								path: 'complaints/stores/:storeId',
								lazy: () =>
									import(
										'./pages/dashboard/complaints/stores/[storeId]/page'
									),
							},
							{
								path: 'complaints/:id',
								lazy: () =>
									import(
										'./pages/dashboard/complaints/[id]/page'
									),
							},
							{
								path: 'audit',
								lazy: () =>
									import('./pages/dashboard/audit/page'),
							},
							{
								path: 'exports',
								lazy: () =>
									import('./pages/dashboard/exports/page'),
							},
							{
								path: 'notices',
								lazy: () =>
									import('./pages/dashboard/notices/page'),
							},
							{
								path: 'notices/website',
								lazy: () =>
									import(
										'./pages/dashboard/notices/website/page'
									),
							},
							{
								path: 'notices/printable',
								lazy: () =>
									import(
										'./pages/dashboard/notices/printable/page'
									),
							},
							{
								path: 'stores',
								lazy: () =>
									import('./pages/dashboard/stores/page'),
							},
							{
								path: 'reasons',
								lazy: () =>
									import('./pages/dashboard/reasons/page'),
							},
							{
								path: 'categories',
								lazy: () =>
									import('./pages/dashboard/categories/page'),
							},
							{
								path: 'users',
								lazy: () =>
									import('./pages/dashboard/users/page'),
							},
							{
								path: 'settings',
								lazy: () =>
									import('./pages/dashboard/settings/page'),
							},
							{
								path: 'sso',
								lazy: () =>
									import('./pages/dashboard/sso/page'),
							},
							{
								path: 'webhooks',
								lazy: () =>
									import('./pages/dashboard/webhooks/page'),
							},
							{
								path: 'webhooks/deliveries',
								lazy: () =>
									import(
										'./pages/dashboard/webhooks/deliveries/page'
									),
							},
						],
					},
					{
						Component: RequirePlatformAdmin,
						children: [
							{
								path: 'platform',
								lazy: () =>
									import('./pages/dashboard/platform/page'),
							},
							{
								path: 'admin-settings',
								lazy: () =>
									import(
										'./pages/dashboard/admin-settings/page'
									),
							},
						],
					},
				],
			},
		],
	},
	{ path: '*', Component: NotFoundPage },
]

// Cada pantalla conserva su layout al fallar una carga o una mutación.
function withErrorBoundaries(routes: RouteObject[]): RouteObject[] {
	return routes.map((route) => ({
		...route,
		ErrorBoundary: DataRouteErrorBoundary,
		...(route.children
			? { children: withErrorBoundaries(route.children) }
			: {}),
	})) as RouteObject[]
}

export const routes = withErrorBoundaries(children)
