import { Download, FileText } from 'lucide-react'
import type { FC } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatDateDisplay } from '@/lib/formatters'
import type {
	ComplaintAttachment,
	ComplaintDetail,
} from '@/modules/complaints/detail-queries'
import { InfoRow, ITEM_TYPE_LABEL, Section } from './shared'

interface ComplaintDetailsCardProps {
	complaint: ComplaintDetail
	attachments: ComplaintAttachment[]
}

export const ComplaintDetailsCard: FC<ComplaintDetailsCardProps> = ({
	complaint,
	attachments,
}) => {
	const handleDownload = (attachment: ComplaintAttachment) => {
		window.open(`/api/files/${attachment.storageKey}`, '_blank')
	}

	return (
		<Section
			icon={<FileText className='size-4' />}
			title='Detalle del reclamo'
		>
			<div className='space-y-3'>
				{complaint.itemType && (
					<InfoRow
						label='Tipo de bien'
						value={
							ITEM_TYPE_LABEL[complaint.itemType] ??
							complaint.itemType
						}
					/>
				)}
				{complaint.itemDescription && (
					<InfoRow
						label='Bien contratado'
						value={complaint.itemDescription}
					/>
				)}
				{complaint.amount && (
					<InfoRow
						label='Monto reclamado'
						value={`${complaint.currency ?? ''} ${complaint.amount}`.trim()}
					/>
				)}
				{complaint.hasProofOfPayment && (
					<InfoRow
						label='Comprobante'
						value={
							complaint.proofOfPaymentType &&
							complaint.proofOfPaymentNumber
								? `${complaint.proofOfPaymentType} N° ${complaint.proofOfPaymentNumber}`
								: 'Sí'
						}
					/>
				)}
				{complaint.incidentDate && (
					<InfoRow
						label='Fecha del incidente'
						value={formatDateDisplay(complaint.incidentDate)}
					/>
				)}
				{complaint.reasonLabel && (
					<InfoRow label='Motivo' value={complaint.reasonLabel} />
				)}

				{complaint.description && (
					<>
						<Separator />
						<div className='space-y-1'>
							<p className='text-xs text-muted-foreground'>
								Descripción del reclamo
							</p>
							<p className='text-sm whitespace-pre-wrap rounded-lg bg-muted/40 px-3 py-2'>
								{complaint.description}
							</p>
						</div>
					</>
				)}
				{complaint.request && (
					<div className='space-y-1'>
						<p className='text-xs text-muted-foreground'>
							Pedido al proveedor
						</p>
						<p className='text-sm whitespace-pre-wrap rounded-lg bg-muted/40 px-3 py-2'>
							{complaint.request}
						</p>
					</div>
				)}
				{(complaint.aiSummary || complaint.aiPriorityReason) && (
					<>
						<Separator />
						<div className='space-y-3 rounded-lg border border-sky-200/70 bg-sky-50/70 px-3 py-3 dark:border-sky-900/40 dark:bg-sky-950/20'>
							<div className='space-y-1'>
								<p className='text-xs font-medium text-sky-800 dark:text-sky-300'>
									Resumen IA
								</p>
								<p className='text-[11px] text-sky-700/80 dark:text-sky-300/80'>
									Apoyo interno para revisar el caso más
									rápido.
								</p>
							</div>
							{complaint.aiSummary && (
								<p className='text-sm whitespace-pre-wrap text-foreground'>
									{complaint.aiSummary}
								</p>
							)}
							{complaint.aiPriorityReason && (
								<div className='space-y-1'>
									<p className='text-xs text-muted-foreground'>
										Motivo de prioridad sugerido por IA
									</p>
									<p className='text-sm whitespace-pre-wrap text-foreground'>
										{complaint.aiPriorityReason}
									</p>
								</div>
							)}
						</div>
					</>
				)}
			</div>

			{attachments.length > 0 && (
				<>
					<Separator />
					<div className='space-y-1.5'>
						<p className='text-xs text-muted-foreground'>
							Archivos adjuntos
						</p>
						<div className='flex flex-col gap-1.5'>
							{attachments.map((attachment) => (
								<div
									key={attachment.id}
									className='flex items-center justify-between gap-2 rounded-lg border px-3 py-2'
								>
									<div className='flex items-center gap-2 min-w-0'>
										<FileText className='size-4 shrink-0 text-muted-foreground' />
										<span className='text-sm truncate'>
											{attachment.fileName}
										</span>
									</div>
									<Button
										variant='ghost'
										size='sm'
										className='shrink-0'
										onClick={() =>
											handleDownload(attachment)
										}
									>
										<Download className='size-4' />
										<span className='sr-only'>
											Descargar
										</span>
									</Button>
								</div>
							))}
						</div>
					</div>
				</>
			)}
		</Section>
	)
}
