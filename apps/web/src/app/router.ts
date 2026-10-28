import { createBrowserRouter } from 'react-router'
import { Root } from './root'
import { routes } from './routes'
import { DataRouteErrorBoundary, LoadingPage } from './routing/route-feedback'

export const router = createBrowserRouter([
	{
		id: 'root',
		Component: Root,
		ErrorBoundary: DataRouteErrorBoundary,
		HydrateFallback: LoadingPage,
		children: routes,
	},
])
