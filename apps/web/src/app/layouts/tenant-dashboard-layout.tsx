import { useSession } from '@/shared/auth/session'
import { DashboardLayout } from './dashboard-layout'

export function TenantDashboardLayout() {
	const { session } = useSession()

	return (
		<DashboardLayout key={session?.organization_id ?? 'no-organization'} />
	)
}
