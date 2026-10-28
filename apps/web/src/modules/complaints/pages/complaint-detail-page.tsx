import {
	OpGetReceipt,
	OpGetResponsePDF,
	PermissionRespond,
} from '@open-reclamos/rpc-client'
import { useCallback, useState } from 'react'
import { useParams } from 'react-router'
import { sileo } from 'sileo'
import { downloadRPC } from '@/shared/api/rpc'
import { useSession } from '@/shared/auth/session'
import { Button } from '@/shared/components/ui/button'
import { errorMessage, getCategories, getComplaint, startReview } from '../api'
import { ComplaintDetailPage as ComplaintDetail } from '../features/complaint-detail/complaint-detail-page'
import { QueryState, useFeatureQuery } from '../hooks/use-feature-query'

export function ComplaintDetailPage() {
	const { id = '' } = useParams<{ id: string }>()
	const { session } = useSession()
	const organizationId = session?.organization?.id ?? session?.organization_id
	const canRespond = session?.capabilities?.[PermissionRespond] === true
	const [busy, setBusy] = useState(false)
	// biome-ignore lint/correctness/useExhaustiveDependencies: Cambiar de empresa invalida los datos aunque el tenant se resuelva mediante la cookie.
	const load = useCallback(
		async (signal: AbortSignal) => {
			const [detail, availableCategories] = await Promise.all([
				getComplaint(id, signal),
				getCategories(signal),
			])

			return { ...detail, availableCategories }
		},
		[id, organizationId],
	)

	const query = useFeatureQuery(load)

	const run = async (action: () => Promise<unknown>) => {
		setBusy(true)

		try {
			await action()
		} catch (error) {
			sileo.error({
				title: 'No se pudo completar la operación',
				description: errorMessage(error),
			})
		} finally {
			setBusy(false)
		}
	}

	if (!query.data) {
		return <QueryState error={query.error} reload={query.reload} />
	}

	return (
		<div className='space-y-4' aria-busy={query.refreshing}>
			{query.error && (
				<div role='alert' className='space-y-2'>
					<p className='text-destructive'>{query.error}</p>
					<Button variant='outline' onClick={query.reload}>
						Reintentar actualización
					</Button>
				</div>
			)}
			<div className='flex flex-wrap justify-end gap-2'>
				{canRespond && query.data.complaint.status === 'open' && (
					<Button
						disabled={busy || query.refreshing}
						onClick={() =>
							run(async () => {
								await startReview(id)
								query.reload()
							})
						}
					>
						Iniciar revisión
					</Button>
				)}
				<Button
					variant='outline'
					disabled={busy}
					onClick={() => run(() => downloadRPC(OpGetReceipt, { id }))}
				>
					Descargar constancia
				</Button>
				{query.data.complaint.officialResponse && (
					<Button
						variant='outline'
						disabled={busy}
						onClick={() =>
							run(() => downloadRPC(OpGetResponsePDF, { id }))
						}
					>
						Descargar respuesta
					</Button>
				)}
			</div>
			<ComplaintDetail
				key={`${organizationId}:${id}`}
				{...query.data}
				canRespond={Boolean(canRespond)}
				onChanged={query.reload}
			/>
		</div>
	)
}
