import { customAlphabet } from 'nanoid'

export const generateTrackingCode = (_now = new Date()): string => {
	const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
	const nanoid = customAlphabet(alphabet, 10)
	const id = nanoid()
	const part1 = id.slice(0, 4)
	const part2 = id.slice(4, 10)
	return `${part1}-${part2}`
}
