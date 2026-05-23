import { S3Client } from 'bun'

export const S3_BUCKET = process.env.S3_BUCKET ?? 'complaints'

export const s3 = new S3Client({
	accessKeyId: process.env.S3_ACCESS_KEY ?? '',
	secretAccessKey: process.env.S3_SECRET_KEY ?? '',
	bucket: S3_BUCKET,
	endpoint: process.env.S3_ENDPOINT ?? '',
	region: 'auto',
})

export async function uploadToS3(
	key: string,
	body: Buffer | Uint8Array,
	contentType: string,
): Promise<void> {
	await s3.file(key).write(body, { type: contentType })
}

export async function getPresignedDownloadUrl(
	key: string,
	expiresInSeconds = 3600,
): Promise<string> {
	return s3.presign(key, { expiresIn: expiresInSeconds })
}

export async function moveS3Object(
	srcKey: string,
	destKey: string,
): Promise<void> {
	const srcFile = s3.file(srcKey)
	const stat = await srcFile.stat()
	const content = await srcFile.arrayBuffer()
	await s3.file(destKey).write(content, { type: stat.type })
	await srcFile.delete()
}

export async function deleteS3Object(key: string): Promise<void> {
	await s3.file(key).delete()
}
