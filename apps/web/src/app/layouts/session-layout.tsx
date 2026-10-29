import { Suspense, useEffect, useState } from 'react'
import { Outlet, useNavigation, useRevalidator } from 'react-router'
import { subscribeContext } from '@/shared/auth/context'
import { SessionProvider, useSession } from '@/shared/auth/session'
import { sessionStore } from '@/shared/auth/session-store'
import { PublicConfigProvider } from '@/shared/config/public-config'
import { LoadingPage } from '../routing/route-feedback'
import { RestoreReturnTo } from '../routing/session-guards'
import { SessionTransition } from '../routing/session-transition'

function SessionContent() {
	const { loading } = useSession()
	const navigation = useNavigation()
	const revalidator = useRevalidator()
	const [changingContext, setChangingContext] = useState(false)

	useEffect(
		() =>
			subscribeContext((changing) => {
				if (changing) {
					setChangingContext(true)
				} else {
					void sessionStore.ensure().then(async () => {
						await revalidator.revalidate()
						setChangingContext(false)
					})
				}
			}),
		[revalidator.revalidate],
	)

	return (
		<>
			<RestoreReturnTo />
			<SessionTransition loading={loading || changingContext}>
				<div aria-busy={navigation.state !== 'idle'}>
					<Suspense fallback={<LoadingPage />}>
						<Outlet />
					</Suspense>
				</div>
			</SessionTransition>
		</>
	)
}

export function Component() {
	return (
		<PublicConfigProvider>
			<SessionProvider>
				<SessionContent />
			</SessionProvider>
		</PublicConfigProvider>
	)
}
