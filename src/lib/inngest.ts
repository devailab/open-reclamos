import { Inngest } from 'inngest'

export const inngest = new Inngest({
	id: process.env.INNGEST_APP_ID || 'open-reclamos',
	baseUrl: process.env.INNGEST_BASE_URL,
	eventKey: process.env.INNGEST_EVENT_KEY,
	signingKey: process.env.INNGEST_SIGNING_KEY,
})
