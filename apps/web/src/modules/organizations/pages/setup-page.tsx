import { SetupFlow } from '../features/onboarding/setup-flow'

export function SetupPage() {
	return (
		<CenteredPageLayout size='wide'>
			<SetupFlow mode='setup' />
		</CenteredPageLayout>
	)
}

import { CenteredPageLayout } from '@/shared/components/centered-page-layout'
