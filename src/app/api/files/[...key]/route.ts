import type { GetObjectCommandOutput } from '@aws-sdk/client-s3'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-server'
import { S3_BUCKET, s3Client } from '@/lib/s3'

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ key: string[] }> },
) {
	const session = await getSession()
	if (!session) {
		return new NextResponse('Unauthorized', { status: 401 })
	}

	const { key: segments } = await params
	const key = segments.join('/')

	const rangeHeader = request.headers.get('range') ?? undefined

	let object: GetObjectCommandOutput
	try {
		object = await s3Client.send(
			new GetObjectCommand({
				Bucket: S3_BUCKET,
				Key: key,
				Range: rangeHeader,
			}),
		)
	} catch (err: unknown) {
		const name =
			err && typeof err === 'object' && 'name' in err ? err.name : ''
		if (name === 'NoSuchKey') {
			return new NextResponse('Not Found', { status: 404 })
		}
		return new NextResponse('Error', { status: 500 })
	}

	if (!object.Body) {
		return new NextResponse('Not Found', { status: 404 })
	}

	const headers = new Headers()

	if (object.ContentType) {
		headers.set('Content-Type', object.ContentType)
	}
	if (object.ContentLength != null) {
		headers.set('Content-Length', String(object.ContentLength))
	}
	if (object.ContentRange) {
		headers.set('Content-Range', object.ContentRange)
	}
	if (object.AcceptRanges) {
		headers.set('Accept-Ranges', object.AcceptRanges)
	}
	if (object.ContentDisposition) {
		headers.set('Content-Disposition', object.ContentDisposition)
	}

	headers.set('Cache-Control', 'private, max-age=3600, immutable')

	const status = rangeHeader ? 206 : 200

	return new NextResponse(object.Body.transformToWebStream(), {
		status,
		headers,
	})
}
