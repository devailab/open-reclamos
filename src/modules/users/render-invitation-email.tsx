import { render } from '@react-email/render'
import { type InvitationAccessMode, InvitationEmail } from './invitation-email'

export async function renderInvitationEmail(params: {
	organizationName: string
	inviteUrl: string
	accessMode: InvitationAccessMode
	providerName?: string
}): Promise<string> {
	return render(
		<InvitationEmail
			organizationName={params.organizationName}
			inviteUrl={params.inviteUrl}
			accessMode={params.accessMode}
			providerName={params.providerName}
		/>,
	)
}
