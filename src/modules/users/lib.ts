import { createHash, randomBytes } from 'node:crypto'

export const createInvitationToken = () => {
	return randomBytes(32).toString('hex')
}

export const hashInvitationToken = (token: string) => {
	return createHash('sha256').update(token).digest('hex')
}
