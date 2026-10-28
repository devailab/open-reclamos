import { OpGetNotices, OpGetPrintableNotice } from '@open-reclamos/rpc-client'
import { requestRPC, rpc } from '@/shared/api/rpc'
import { validateNoticeUrl } from './notice-url'
import type { NoticeContext, NoticesRecord } from './types'
import type { Orientation } from './use-notice-state'

export function mapNotices(record: NoticesRecord): NoticeContext {
	if (!record.organization_url) {
		throw new Error(
			'El servidor no devolvió el enlace público de la organización.',
		)
	}

	return {
		defaultQrUrl: record.organization_url,
		stores: (Array.isArray(record.stores) ? record.stores : []).map(
			(store) => ({
				id: store.store_id,
				name: store.name,
				url: store.url,
			}),
		),
	}
}

export async function getNotices(signal?: AbortSignal) {
	return mapNotices(await rpc<NoticesRecord>(OpGetNotices, {}, signal))
}

export interface PrintableNoticeInput {
	orientation: Orientation
	qrUrl: string
	storeId?: string
}

export function printableNoticeData(input: PrintableNoticeInput) {
	const qrUrl = input.qrUrl.trim()

	if (qrUrl) {
		const error = validateNoticeUrl(qrUrl)

		if (error) {
			throw new Error(error)
		}
	}

	return {
		orientation: input.orientation,
		...(qrUrl ? { qr_url: qrUrl } : {}),
		...(input.storeId ? { store_id: input.storeId } : {}),
	}
}

export async function getPrintableNotice(
	input: PrintableNoticeInput,
	signal?: AbortSignal,
) {
	signal?.throwIfAborted()

	const response = await requestRPC(
		OpGetPrintableNotice,
		{
			data: printableNoticeData(input),
		},
		signal,
	)

	signal?.throwIfAborted()

	if (
		!response.document.length ||
		response.contentType !== 'application/pdf'
	) {
		throw new Error('El servidor no devolvió un PDF válido del aviso.')
	}

	return response
}
