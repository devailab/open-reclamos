import { Outlet } from 'react-router'
import { CenteredPageLayout } from '../../shared/components/centered-page-layout'

export function AuthLayout() {
	return (
		<CenteredPageLayout>
			<Outlet />
		</CenteredPageLayout>
	)
}
