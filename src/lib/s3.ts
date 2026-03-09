import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const S3_ENDPOINT = process.env.S3_ENDPOINT ?? ''
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY ?? ''
const S3_SECRET_KEY = process.env.S3_SECRET_KEY ?? ''
export const S3_BUCKET = process.env.S3_BUCKET ?? 'complaints'

export const s3Client = new S3Client({
	endpoint: S3_ENDPOINT,
	credentials: {
		accessKeyId: S3_ACCESS_KEY,
		secretAccessKey: S3_SECRET_KEY,
	},
	region: 'auto',
	forcePathStyle: true,
})

export async function uploadToS3(
	key: string,
	body: Buffer | Uint8Array,
	contentType: string,
): Promise<void> {
	const command = new PutObjectCommand({
		Bucket: S3_BUCKET,
		Key: key,
		Body: body,
		ContentType: contentType,
	})
	await s3Client.send(command)
}
