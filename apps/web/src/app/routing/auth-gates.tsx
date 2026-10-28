import { Outlet } from 'react-router'
import { LoginReturnTo, SessionReady } from './session-guards'

export function LoginReady() {
	return (
		<SessionReady>
			<LoginReturnTo>
				<Outlet />
			</LoginReturnTo>
		</SessionReady>
	)
}

export function RegisterReady() {
	return (
		<SessionReady>
			<Outlet />
		</SessionReady>
	)
}
