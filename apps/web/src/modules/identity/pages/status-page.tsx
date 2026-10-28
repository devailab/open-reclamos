import { MsgSSOFailed } from '@open-reclamos/rpc-client'
import { useSearchParams } from 'react-router'
import { ErrorPage } from '@/shared/components/feedback/error-page'
import { AuthStatusPage } from './auth-status-page'

export function Component() {
	const [params] = useSearchParams()
	const failure = params.get('error')

	if (failure) {
		return (
			<ErrorPage
				error={new Error(`${MsgSSOFailed} ${failure}`)}
				retry={() => window.location.assign('/login')}
			/>
		)
	}

	return <AuthStatusPage />
}
