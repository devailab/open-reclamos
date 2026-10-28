import { Navigate } from 'react-router'

export function HomePage() {
	return <Navigate to='/login' replace />
}
