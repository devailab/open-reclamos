import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

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

export async function getPresignedDownloadUrl(
	key: string,
	expiresInSeconds = 3600,
): Promise<string> {
	const command = new GetObjectCommand({
		Bucket: S3_BUCKET,
		Key: key,
	})
	return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds })
}

/**
 * Mueve un objeto de srcKey a destKey dentro del mismo bucket.
 * S3 no tiene operación de rename nativa, por lo que se hace copy + delete.
 */
export async function moveS3Object(
	srcKey: string,
	destKey: string,
): Promise<void> {
	await s3Client.send(
		new CopyObjectCommand({
			Bucket: S3_BUCKET,
			CopySource: `${S3_BUCKET}/${srcKey}`,
			Key: destKey,
		}),
	)
	await s3Client.send(
		new DeleteObjectCommand({
			Bucket: S3_BUCKET,
			Key: srcKey,
		}),
	)
}
