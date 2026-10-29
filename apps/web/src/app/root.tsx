import { Outlet } from 'react-router'
import FeedbackDialog from '@/shared/components/feedback-dialog'
import { ThemeToaster } from '@/shared/components/theme/theme-toaster'

export function Root() {
	return (
		<>
			<Outlet />
			<FeedbackDialog />
			<ThemeToaster />
		</>
	)
}
