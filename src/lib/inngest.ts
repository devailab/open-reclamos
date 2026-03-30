import { Inngest } from 'inngest'

export const inngest = new Inngest({
	id: process.env.INNGEST_APP_ID || 'open-reclamos',
})
