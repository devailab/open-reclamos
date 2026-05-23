import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-server'
import { getNoticeLinkContextForUser } from '@/modules/notices/queries'
import { PrintableClientWrapper } from './_features/printable-client-wrapper'

export default async function NoticesPrintablePage() {
	const session = await getSession()
	if (!session) redirect('/login')

	const linkContext = await getNoticeLinkContextForUser({
		userId: session.user.id,
		frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
	})
	if (!linkContext) redirect('/setup')

	return (
		<PrintableClientWrapper
			defaultQrUrl={linkContext.defaultQrUrl}
			stores={linkContext.stores}
		/>
	)
}
