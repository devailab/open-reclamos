import { ErrorPage } from '@/shared/components/feedback/error-page'

export { ErrorPage } from '@/shared/components/feedback/error-page'

import { Link, useRevalidator, useRouteError } from 'react-router'
import { sessionStore } from '@/shared/auth/session-store'
import { PageLoading } from '@/shared/components/page-loading'

export function LoadingPage() {
	return <PageLoading className='min-h-[50svh]' />
}

export function DataRouteErrorBoundary() {
	const cause = useRouteError()
	const revalidator = useRevalidator()
	const error = cause instanceof Error ? cause : new Error(String(cause))

	return (
		<ErrorPage
			error={error}
			retry={() => {
				void sessionStore.refresh().then(() => revalidator.revalidate())
			}}
		/>
	)
}

export function NotFoundPage() {
	return (
		<main className='space-y-3 p-4'>
			<h1 className='text-xl font-semibold'>Página no encontrada</h1>
			<Link to='/'>Volver al inicio</Link>
		</main>
	)
}
