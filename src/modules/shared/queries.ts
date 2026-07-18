import 'server-only'

import { count, type SQL } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import { db } from '@/database/database'

export async function countRows(
	table: PgTable,
	whereClause: SQL<unknown> | undefined,
): Promise<number> {
	const [total] = await db
		.select({ total: count() })
		.from(table)
		.where(whereClause)

	return total?.total ?? 0
}
