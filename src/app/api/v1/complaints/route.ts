import {
	and,
	count,
	desc,
	eq,
	gte,
	ilike,
	isNotNull,
	lte,
	or,
	type SQL,
} from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { db } from '@/database/database'
import { complaintReasons, complaints, stores } from '@/database/schema'
import { resolveApiKey, unauthorizedResponse } from '@/lib/api-auth'

const PAGE_SIZE_DEFAULT = 20
const PAGE_SIZE_MAX = 100

function buildWhere(
	organizationId: string,
	params: URLSearchParams,
): SQL<unknown> | undefined {
	const conditions: SQL<unknown>[] = [
		eq(complaints.organizationId, organizationId),
	]

	const status = params.get('status')
	if (status) conditions.push(eq(complaints.status, status))

	const type = params.get('type')
	if (type) conditions.push(eq(complaints.type, type))

	const storeId = params.get('storeId')
	if (storeId) conditions.push(eq(complaints.storeId, storeId))

	const search = params.get('search')?.trim()
	if (search) {
		const term = `%${search}%`
		conditions.push(
			or(
				ilike(complaints.correlative, term),
				ilike(complaints.firstName, term),
				ilike(complaints.lastName, term),
				ilike(complaints.trackingCode, term),
			) as SQL<unknown>,
		)
	}

	const from = params.get('from')
	if (from) {
		const date = new Date(from)
		if (!Number.isNaN(date.getTime())) {
			conditions.push(gte(complaints.createdAt, date))
		}
	}

	const to = params.get('to')
	if (to) {
		const date = new Date(to)
		if (!Number.isNaN(date.getTime())) {
			conditions.push(lte(complaints.createdAt, date))
		}
	}

	return and(...conditions)
}

/**
 * GET /api/v1/complaints
 *
 * Parámetros de búsqueda (query params):
 *   page        number  (default 1)
 *   pageSize    number  (default 20, max 100)
 *   status      string  open | in_progress | resolved | closed
 *   type        string  reclamo | queja
 *   storeId     string  UUID de la tienda
 *   search      string  Búsqueda por correlativo, nombre o código de seguimiento
 *   from        string  ISO date — fecha de creación desde
 *   to          string  ISO date — fecha de creación hasta
 */
export async function GET(request: NextRequest) {
	const auth = await resolveApiKey(request)
	if (!auth) return unauthorizedResponse()

	const params = request.nextUrl.searchParams

	const page = Math.max(1, Number(params.get('page') ?? 1))
	const pageSize = Math.min(
		PAGE_SIZE_MAX,
		Math.max(1, Number(params.get('pageSize') ?? PAGE_SIZE_DEFAULT)),
	)
	const offset = (page - 1) * pageSize

	const where = buildWhere(auth.organizationId, params)

	const [rows, [totalRow]] = await Promise.all([
		db
			.select({
				id: complaints.id,
				correlative: complaints.correlative,
				trackingCode: complaints.trackingCode,
				type: complaints.type,
				status: complaints.status,
				priority: complaints.priority,
				storeId: complaints.storeId,
				storeName: stores.name,
				reasonLabel: complaintReasons.reason,
				// consumidor
				firstName: complaints.firstName,
				lastName: complaints.lastName,
				personType: complaints.personType,
				documentType: complaints.documentType,
				documentNumber: complaints.documentNumber,
				email: complaints.email,
				// reclamo
				itemType: complaints.itemType,
				incidentDate: complaints.incidentDate,
				// respuesta
				hasResponse: isNotNull(complaints.officialResponse),
				respondedAt: complaints.respondedAt,
				responseDeadline: complaints.responseDeadline,
				// entrega
				receiptDeliveryStatus: complaints.receiptDeliveryStatus,
				responseDeliveryStatus: complaints.responseDeliveryStatus,
				// fechas
				createdAt: complaints.createdAt,
				updatedAt: complaints.updatedAt,
			})
			.from(complaints)
			.innerJoin(stores, eq(complaints.storeId, stores.id))
			.leftJoin(
				complaintReasons,
				eq(complaints.reasonId, complaintReasons.id),
			)
			.where(where)
			.orderBy(desc(complaints.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ total: count() }).from(complaints).where(where),
	])

	const total = totalRow?.total ?? 0

	return Response.json({
		data: rows,
		pagination: {
			page,
			pageSize,
			total,
			totalPages: Math.ceil(total / pageSize),
		},
	})
}
