import { and, eq, isNull } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { NextResponse } from 'next/server'
import { db } from '@/database/database'
import { stores } from '@/database/schema'
import { deleteS3Object, uploadToS3 } from '@/lib/s3'

const ALLOWED_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'application/pdf',
])
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
// Margen para el overhead multipart (boundary + campos)
const MAX_BODY_SIZE = MAX_FILE_SIZE + 64 * 1024
const MAX_FILES_PER_WINDOW = 20
const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Formato de las claves temporales emitidas por este endpoint
const TMP_KEY_REGEX =
	/^tmp\/complaints\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9_-]{21}\.[a-z0-9]{1,10}$/

// Rate limiter en memoria por proceso. Nota: en despliegues con varias
// réplicas este límite es por instancia; el límite duro de tamaño de cuerpo
// debe aplicarse también en el proxy/plataforma delante de Next.js.
const uploadCounts = new Map<string, { count: number; resetAt: number }>()

function getRateLimitKey(request: Request): string {
	const forwarded = request.headers.get('x-forwarded-for')
	const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
	return ip
}

function checkRateLimit(key: string): boolean {
	const now = Date.now()
	const entry = uploadCounts.get(key)

	if (!entry || entry.resetAt < now) {
		uploadCounts.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS })
		return true
	}

	if (entry.count >= MAX_FILES_PER_WINDOW) {
		return false
	}

	entry.count++
	return true
}

// Verificación de firma (magic bytes) para no confiar solo en el Content-Type
function matchesMagicBytes(buffer: Buffer, contentType: string): boolean {
	if (buffer.length < 12) return false

	switch (contentType) {
		case 'image/jpeg':
			return (
				buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
			)
		case 'image/png':
			return (
				buffer[0] === 0x89 &&
				buffer[1] === 0x50 &&
				buffer[2] === 0x4e &&
				buffer[3] === 0x47
			)
		case 'image/webp':
			return (
				buffer.toString('latin1', 0, 4) === 'RIFF' &&
				buffer.toString('latin1', 8, 12) === 'WEBP'
			)
		case 'application/pdf':
			return buffer.toString('latin1', 0, 4) === '%PDF'
		default:
			return false
	}
}

async function isActiveStore(storeId: string): Promise<boolean> {
	const [store] = await db
		.select({ id: stores.id })
		.from(stores)
		.where(
			and(
				eq(stores.id, storeId),
				eq(stores.formEnabled, true),
				isNull(stores.deletedAt),
			),
		)
		.limit(1)

	return Boolean(store)
}

export async function POST(request: Request) {
	const rateLimitKey = getRateLimitKey(request)
	if (!checkRateLimit(rateLimitKey)) {
		return NextResponse.json(
			{ error: 'Demasiados archivos subidos. Intenta más tarde.' },
			{ status: 429 },
		)
	}

	// Rechazar cuerpos sobredimensionados antes de materializarlos en memoria
	const contentLength = Number(request.headers.get('content-length'))
	if (!Number.isFinite(contentLength) || contentLength > MAX_BODY_SIZE) {
		return NextResponse.json(
			{ error: 'El archivo supera el tamaño máximo de 5MB.' },
			{ status: 413 },
		)
	}

	let formData: FormData
	try {
		formData = await request.formData()
	} catch {
		return NextResponse.json(
			{ error: 'Solicitud inválida.' },
			{ status: 400 },
		)
	}

	const file = formData.get('file')
	const storeId = formData.get('storeId')

	if (!file || !(file instanceof File)) {
		return NextResponse.json(
			{ error: 'No se recibió ningún archivo.' },
			{ status: 400 },
		)
	}

	if (!storeId || typeof storeId !== 'string' || !UUID_REGEX.test(storeId)) {
		return NextResponse.json(
			{ error: 'Tienda no especificada.' },
			{ status: 400 },
		)
	}

	if (!(await isActiveStore(storeId))) {
		return NextResponse.json(
			{ error: 'La tienda indicada no está disponible.' },
			{ status: 400 },
		)
	}

	if (!ALLOWED_TYPES.has(file.type)) {
		return NextResponse.json(
			{ error: 'Tipo de archivo no permitido. Solo imágenes y PDF.' },
			{ status: 400 },
		)
	}

	if (file.size > MAX_FILE_SIZE) {
		return NextResponse.json(
			{ error: 'El archivo supera el tamaño máximo de 5MB.' },
			{ status: 400 },
		)
	}

	const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
	const safeExt = /^[a-z0-9]{1,10}$/.test(ext) ? ext : 'bin'
	const key = `tmp/complaints/${storeId.toLowerCase()}/${nanoid()}.${safeExt}`

	try {
		const buffer = Buffer.from(await file.arrayBuffer())

		if (!matchesMagicBytes(buffer, file.type)) {
			return NextResponse.json(
				{ error: 'El contenido del archivo no coincide con su tipo.' },
				{ status: 400 },
			)
		}

		await uploadToS3(key, buffer, file.type)
	} catch {
		return NextResponse.json(
			{ error: 'Error al subir el archivo. Intenta de nuevo.' },
			{ status: 500 },
		)
	}

	return NextResponse.json({
		key,
		fileName: file.name,
		contentType: file.type,
	})
}

/**
 * Elimina un archivo temporal cuando el consumidor lo retira del formulario
 * antes de enviar el reclamo. Solo acepta claves `tmp/complaints/...` con el
 * formato exacto emitido por este endpoint.
 */
export async function DELETE(request: Request) {
	let body: { key?: unknown }
	try {
		body = await request.json()
	} catch {
		return NextResponse.json(
			{ error: 'Solicitud inválida.' },
			{ status: 400 },
		)
	}

	const key = body.key
	if (typeof key !== 'string' || !TMP_KEY_REGEX.test(key)) {
		return NextResponse.json(
			{ error: 'Clave de archivo no válida.' },
			{ status: 400 },
		)
	}

	try {
		await deleteS3Object(key)
	} catch {
		// Best-effort: el lifecycle/TTL del bucket limpia remanentes de tmp/
	}

	return NextResponse.json({ ok: true })
}
