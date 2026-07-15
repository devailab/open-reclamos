import { redirect } from 'next/navigation'

export default function SsoLogoutCompletePage() {
	redirect('/login')
}
