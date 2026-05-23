import { db } from '@/database/database'
import { users } from '@/database/schema'

export async function hasAnyUser(): Promise<boolean> {
	const [row] = await db.select({ id: users.id }).from(users).limit(1)
	return row !== undefined
}
