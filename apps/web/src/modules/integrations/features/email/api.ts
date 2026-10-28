import { OpTestEmail } from '@open-reclamos/rpc-client'
import { rpc } from '@/shared/api/rpc'

export async function sendTestEmail(input: { recipientEmail: string | null }) {
	try {
		const result = await rpc<{ status: 'sent' | 'skipped' }>(OpTestEmail, {
			data: { email: input.recipientEmail ?? '' },
		})

		return { status: result.status, recipientEmail: input.recipientEmail }
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'No se pudo enviar la prueba.',
		}
	}
}
