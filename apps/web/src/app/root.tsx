import { Suspense, useEffect, useState } from 'react'
import { Outlet, useNavigation, useRevalidator } from 'react-router'
import { subscribeContext } from '@/shared/auth/context'
import { sessionStore } from '@/shared/auth/session-store'
import FeedbackDialog from '@/shared/components/feedback-dialog'
import { ThemeToaster } from '@/shared/components/theme/theme-toaster'
import { LoadingPage } from './routing/route-feedback'
import { RestoreReturnTo } from './routing/session-guards'

export function Root() {
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
			{changingContext ? <LoadingPage /> : null}
			<div
				hidden={changingContext}
				aria-busy={navigation.state !== 'idle'}
			>
				<Suspense fallback={<LoadingPage />}>
					<Outlet />
				</Suspense>
			</div>
			<FeedbackDialog />
			<ThemeToaster />
		</>
	)
}
