import { endOfDay, startOfDay } from 'date-fns'
import {
	and,
	count,
	desc,
	eq,
	gte,
	ilike,
	inArray,
	isNotNull,
	lte,
	or,
	type SQL,
	sql,
} from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { db } from '@/database/database'
import {
	complaintDeliveries,
	complaintDetails,
	complaintReasons,
	complaints,
	stores,
} from '@/database/schema'
import {
	forbiddenResponse,
	getAllowedStoreIds,
	resolveApiKey,
	unauthorizedResponse,
} from '@/lib/api-auth'
import { hasPermission } from '@/modules/rbac/queries'

const PAGE_SIZE_DEFAULT = 20
const PAGE_SIZE_MAX = 100

const VALID_STATUSES = ['open', 'in_review', 'resolved'] as const
const VALID_TYPES = ['claim', 'complaint'] as const
const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function badRequest(message: string) {
	return Response.json({ error: message }, { status: 400 })
}

function parsePositiveInt(value: string | null): number | null | 'invalid' {
	if (value === null) return null
	const parsed = Number(value)
	if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
		return 'invalid'
	}
	return parsed
}

function buildWhere(
	organizationId: string,
	allowedStoreIds: string[] | undefined,
	params: URLSearchParams,
): { where: SQL<unknown> | undefined } | { error: string } {
	const conditions: SQL<unknown>[] = [
		eq(complaints.organizationId, organizationId),
	]

	if (allowedStoreIds !== undefined) {
		if (allowedStoreIds.length === 0) {
			conditions.push(sql`false`)
		} else {
			conditions.push(inArray(complaints.storeId, allowedStoreIds))
		}
	}

	const status = params.get('status')
	if (status) {
		if (
			!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])
		) {
			return { error: `Parámetro status inválido: "${status}".` }
		}
		conditions.push(eq(complaints.status, status))
	}

	const type = params.get('type')
	if (type) {
		if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
			return { error: `Parámetro type inválido: "${type}".` }
		}
		conditions.push(eq(complaints.type, type))
	}

	const storeId = params.get('storeId')
	if (storeId) {
		if (!UUID_REGEX.test(storeId)) {
			return { error: 'Parámetro storeId debe ser un UUID válido.' }
		}
		conditions.push(eq(complaints.storeId, storeId))
	}

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
		if (Number.isNaN(date.getTime())) {
			return { error: 'Parámetro from debe ser una fecha válida.' }
		}
		conditions.push(gte(complaints.createdAt, startOfDay(date)))
	}

	const to = params.get('to')
	if (to) {
		const date = new Date(to)
		if (Number.isNaN(date.getTime())) {
			return { error: 'Parámetro to debe ser una fecha válida.' }
		}
		// Fechas de calendario incluyen el día completo indicado
		conditions.push(lte(complaints.createdAt, endOfDay(date)))
	}

	return { where: and(...conditions) }
}

/**
 * GET /api/v1/complaints
 *
 * Requiere el permiso `complaints.view` y respeta la restricción de tiendas
 * del miembro autenticado.
 *
 * Parámetros de búsqueda (query params):
 *   page        number  (default 1)
 *   pageSize    number  (default 20, max 100)
 *   status      string  open | in_review | resolved
 *   type        string  claim | complaint
 *   storeId     string  UUID de la tienda
 *   search      string  Búsqueda por correlativo, nombre o código de seguimiento
 *   from        string  ISO date — fecha de creación desde (inicio del día)
 *   to          string  ISO date — fecha de creación hasta (fin del día)
 */
export async function GET(request: NextRequest) {
	const auth = await resolveApiKey(request)
	if (!auth) return unauthorizedResponse()

	if (!hasPermission(auth.membership, 'complaints.view')) {
		return forbiddenResponse(
			'El API key no tiene permiso para ver reclamos.',
		)
	}

	const params = request.nextUrl.searchParams

	const pageParam = parsePositiveInt(params.get('page'))
	if (pageParam === 'invalid') {
		return badRequest('Parámetro page debe ser un entero positivo.')
	}
	const pageSizeParam = parsePositiveInt(params.get('pageSize'))
	if (pageSizeParam === 'invalid') {
		return badRequest('Parámetro pageSize debe ser un entero positivo.')
	}

	const page = pageParam ?? 1
	const pageSize = Math.min(PAGE_SIZE_MAX, pageSizeParam ?? PAGE_SIZE_DEFAULT)
	const offset = (page - 1) * pageSize

	const allowedStoreIds = getAllowedStoreIds(auth.membership)
	const built = buildWhere(auth.organizationId, allowedStoreIds, params)
	if ('error' in built) return badRequest(built.error)
	const { where } = built

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
				legalName: complaints.legalName,
				legalTaxId: complaints.legalTaxId,
				documentType: complaints.documentType,
				documentNumber: complaints.documentNumber,
				email: complaints.email,
				// reclamo
				itemType: complaints.itemType,
				incidentDate: complaints.incidentDate,
				// respuesta
				hasResponse: isNotNull(complaintDetails.officialResponse),
				respondedAt: complaintDetails.respondedAt,
				responseDeadline: complaints.responseDeadline,
				// entrega
				receiptDeliveryStatus:
					complaintDeliveries.receiptDeliveryStatus,
				responseDeliveryStatus:
					complaintDeliveries.responseDeliveryStatus,
				// fechas
				createdAt: complaints.createdAt,
				updatedAt: complaints.updatedAt,
			})
			.from(complaints)
			.innerJoin(stores, eq(complaints.storeId, stores.id))
			.leftJoin(
				complaintDetails,
				eq(complaintDetails.complaintId, complaints.id),
			)
			.leftJoin(
				complaintDeliveries,
				eq(complaintDeliveries.complaintId, complaints.id),
			)
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
