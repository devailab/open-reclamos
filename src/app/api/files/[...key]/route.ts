import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-server'
import { s3 } from '@/lib/s3'
import { getAttachmentByStorageKey } from '@/modules/complaints/detail-queries'
import { isOrganizationActive } from '@/modules/platform/status'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'

interface ParsedRange {
	start: number
	end: number
}

/**
 * Parsing estricto de un único rango `bytes=`. Retorna:
 * - null: header ausente o con formato/múltiples rangos → responder 200 completo
 * - 'unsatisfiable': rango fuera de los límites → responder 416
 */
function parseRangeHeader(
	rangeHeader: string | null,
	size: number,
): ParsedRange | null | 'unsatisfiable' {
	if (!rangeHeader) return null

	const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())
	if (!match) return null

	const [, startRaw, endRaw] = match

	// "bytes=-" no es un rango válido
	if (startRaw === '' && endRaw === '') return null

	// Rango sufijo: bytes=-N (últimos N bytes)
	if (startRaw === '') {
		const suffixLength = parseInt(endRaw, 10)
		if (suffixLength === 0) return 'unsatisfiable'
		const start = Math.max(0, size - suffixLength)
		return { start, end: size - 1 }
	}

	const start = parseInt(startRaw, 10)
	if (start >= size) return 'unsatisfiable'

	const end = endRaw === '' ? size - 1 : parseInt(endRaw, 10)
	if (start > end) return 'unsatisfiable'

	return { start, end: Math.min(end, size - 1) }
}

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ key: string[] }> },
) {
	const session = await getSession()
	if (!session) {
		return new NextResponse('Unauthorized', { status: 401 })
	}

	const membership = await getMembershipContext(session.user.id)
	if (!membership) {
		return new NextResponse('Forbidden', { status: 403 })
	}

	// Corte de plataforma: una organización suspendida no descarga adjuntos.
	const isActive = await isOrganizationActive(membership.organizationId)
	if (!isActive) {
		return new NextResponse('Forbidden', { status: 403 })
	}

	if (!hasPermission(membership, 'complaints.view')) {
		return new NextResponse('Forbidden', { status: 403 })
	}

	const { key: segments } = await params
	const key = segments.join('/')

	const attachment = await getAttachmentByStorageKey(
		key,
		membership.organizationId,
	)
	if (!attachment) {
		return new NextResponse('Forbidden', { status: 403 })
	}

	// Respetar la restricción de tiendas del miembro
	if (
		membership.storeAccessMode === 'selected' &&
		!membership.storeIds.includes(attachment.storeId)
	) {
		return new NextResponse('Forbidden', { status: 403 })
	}

	const file = s3.file(key)

	let stat: Awaited<ReturnType<typeof file.stat>>
	try {
		stat = await file.stat()
	} catch (err: unknown) {
		const name =
			err && typeof err === 'object' && 'name' in err ? err.name : ''
		if (name === 'NoSuchKey') {
			return new NextResponse('Not Found', { status: 404 })
		}
		return new NextResponse('Error', { status: 500 })
	}

	const headers = new Headers()
	headers.set('Content-Type', stat.type ?? 'application/octet-stream')
	headers.set('Accept-Ranges', 'bytes')
	headers.set('Cache-Control', 'private, max-age=3600, immutable')

	const range = parseRangeHeader(request.headers.get('range'), stat.size)

	if (range === 'unsatisfiable') {
		headers.set('Content-Range', `bytes */${stat.size}`)
		return new NextResponse(null, { status: 416, headers })
	}

	if (range) {
		headers.set(
			'Content-Range',
			`bytes ${range.start}-${range.end}/${stat.size}`,
		)
		headers.set('Content-Length', String(range.end - range.start + 1))
		return new NextResponse(
			file.slice(range.start, range.end + 1).stream(),
			{ status: 206, headers },
		)
	}

	headers.set('Content-Length', String(stat.size))
	return new NextResponse(file.stream(), { status: 200, headers })
}
