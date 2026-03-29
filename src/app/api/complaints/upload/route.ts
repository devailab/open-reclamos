import { nanoid } from 'nanoid'
import { NextResponse } from 'next/server'
import { uploadToS3 } from '@/lib/s3'

const ALLOWED_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
	'application/pdf',
])
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FILES_PER_WINDOW = 20
const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour

// In-memory rate limiter (resets on server restart)
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

export async function POST(request: Request) {
	const rateLimitKey = getRateLimitKey(request)
	if (!checkRateLimit(rateLimitKey)) {
		return NextResponse.json(
			{ error: 'Demasiados archivos subidos. Intenta más tarde.' },
			{ status: 429 },
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

	if (!storeId || typeof storeId !== 'string') {
		return NextResponse.json(
			{ error: 'Tienda no especificada.' },
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
	const key = `tmp/complaints/${storeId}/${nanoid()}.${safeExt}`

	try {
		const buffer = Buffer.from(await file.arrayBuffer())
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
