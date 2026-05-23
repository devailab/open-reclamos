import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { db } from '@/database/database'
import { organizations } from '@/database/schema'
import { getSession } from '@/lib/auth-server'
import { deleteS3Object, uploadToS3 } from '@/lib/s3'
import { getMembershipContext, hasPermission } from '@/modules/rbac/queries'

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_FILE_SIZE = 2 * 1024 * 1024

function getExtension(contentType: string) {
	switch (contentType) {
		case 'image/png':
			return 'png'
		case 'image/jpeg':
			return 'jpg'
		case 'image/webp':
			return 'webp'
		default:
			return 'bin'
	}
}

export async function POST(request: Request) {
	const session = await getSession()
	if (!session) {
		return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
	}

	const membership = await getMembershipContext(session.user.id)
	if (!membership || !hasPermission(membership, 'settings.manage')) {
		return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
	}

	const formData = await request.formData()
	const file = formData.get('file')

	if (!(file instanceof File)) {
		return NextResponse.json(
			{ error: 'No se recibió ningún archivo.' },
			{ status: 400 },
		)
	}

	if (!ALLOWED_TYPES.has(file.type)) {
		return NextResponse.json(
			{ error: 'Formato inválido. Usa PNG, JPG o WebP.' },
			{ status: 400 },
		)
	}

	if (file.size > MAX_FILE_SIZE) {
		return NextResponse.json(
			{ error: 'El archivo supera el máximo de 2 MB.' },
			{ status: 400 },
		)
	}

	const [organization] = await db
		.select({ logoKey: organizations.logoKey })
		.from(organizations)
		.where(eq(organizations.id, membership.organizationId))
		.limit(1)

	if (!organization) {
		return NextResponse.json(
			{ error: 'No se encontró la organización activa.' },
			{ status: 404 },
		)
	}

	const nextLogoKey = `organizations/${membership.organizationId}/logos/${nanoid()}.${getExtension(file.type)}`
	const now = new Date()
	let didUploadNewLogo = false

	try {
		const buffer = Buffer.from(await file.arrayBuffer())
		await uploadToS3(nextLogoKey, buffer, file.type)
		didUploadNewLogo = true

		await db
			.update(organizations)
			.set({
				logoKey: nextLogoKey,
				updatedAt: now,
				updatedBy: session.user.id,
			})
			.where(eq(organizations.id, membership.organizationId))

		if (organization.logoKey) {
			deleteS3Object(organization.logoKey).catch((error) => {
				console.error(
					'[organizations/logo] No se pudo eliminar el logo anterior:',
					error,
				)
			})
		}

		revalidatePath('/dashboard')
		revalidatePath('/dashboard/settings')
		return NextResponse.json({
			success: true,
			logoKey: nextLogoKey,
			logoVersion: now.toISOString(),
		})
	} catch (error) {
		if (didUploadNewLogo) {
			deleteS3Object(nextLogoKey).catch((cleanupError) => {
				console.error(
					'[organizations/logo] No se pudo limpiar el logo fallido:',
					cleanupError,
				)
			})
		}
		console.error('[organizations/logo] Error al subir logo:', error)
		return NextResponse.json(
			{ error: 'No se pudo subir el logo. Inténtalo de nuevo.' },
			{ status: 500 },
		)
	}
}
