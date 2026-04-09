import { render } from '@react-email/render'
import { InvitationEmail } from './invitation-email'

export async function renderInvitationEmail(params: {
	organizationName: string
	inviteUrl: string
}): Promise<string> {
	return render(
		<InvitationEmail
			organizationName={params.organizationName}
			inviteUrl={params.inviteUrl}
		/>,
	)
}
