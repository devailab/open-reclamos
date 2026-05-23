import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/database/database'
import { organizations } from '@/database/schema'
import { getSession } from '@/lib/auth-server'
import { s3 } from '@/lib/s3'
import { getMembershipContext } from '@/modules/rbac/queries'

export async function GET(
	_request: Request,
	{
		params,
	}: {
		params: Promise<{ organizationId: string }>
	},
) {
	const session = await getSession()
	if (!session) {
		return new NextResponse('Unauthorized', { status: 401 })
	}

	const { organizationId } = await params
	const membership = await getMembershipContext(
		session.user.id,
		organizationId,
	)
	if (!membership) {
		return new NextResponse('Forbidden', { status: 403 })
	}

	const [organization] = await db
		.select({ logoKey: organizations.logoKey })
		.from(organizations)
		.where(eq(organizations.id, organizationId))
		.limit(1)

	if (!organization?.logoKey) {
		return new NextResponse('Not Found', { status: 404 })
	}

	const file = s3.file(organization.logoKey)

	let stat: Awaited<ReturnType<typeof file.stat>>
	try {
		stat = await file.stat()
	} catch (error: unknown) {
		const name =
			error && typeof error === 'object' && 'name' in error
				? error.name
				: ''
		if (name === 'NoSuchKey') {
			return new NextResponse('Not Found', { status: 404 })
		}
		return new NextResponse('Error', { status: 500 })
	}

	const headers = new Headers()
	headers.set('Content-Type', stat.type ?? 'application/octet-stream')
	headers.set('Cache-Control', 'private, no-store')
	headers.set('Content-Length', String(stat.size))

	return new NextResponse(file.stream(), { status: 200, headers })
}
