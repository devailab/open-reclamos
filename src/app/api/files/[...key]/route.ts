import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-server'
import { s3 } from '@/lib/s3'
import { getAttachmentByStorageKey } from '@/modules/complaints/detail-queries'
import { getMembershipContext } from '@/modules/rbac/queries'

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

	const { key: segments } = await params
	const key = segments.join('/')

	const attachment = await getAttachmentByStorageKey(
		key,
		membership.organizationId,
	)
	if (!attachment) {
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

	const rangeHeader = request.headers.get('range')

	if (rangeHeader) {
		const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader)
		if (match) {
			const start = parseInt(match[1], 10)
			const end = match[2] ? parseInt(match[2], 10) : stat.size - 1
			headers.set('Content-Range', `bytes ${start}-${end}/${stat.size}`)
			headers.set('Content-Length', String(end - start + 1))
			return new NextResponse(file.slice(start, end + 1).stream(), {
				status: 206,
				headers,
			})
		}
	}

	headers.set('Content-Length', String(stat.size))
	return new NextResponse(file.stream(), { status: 200, headers })
}
