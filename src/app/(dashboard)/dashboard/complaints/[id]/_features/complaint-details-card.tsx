import { FileText } from 'lucide-react'
import type { FC } from 'react'
import { Separator } from '@/components/ui/separator'
import { formatDateDisplay } from '@/lib/formatters'
import type { ComplaintDetail } from '@/modules/complaints/detail-queries'
import { InfoRow, ITEM_TYPE_LABEL, Section } from './shared'

interface ComplaintDetailsCardProps {
	complaint: ComplaintDetail
}

export const ComplaintDetailsCard: FC<ComplaintDetailsCardProps> = ({
	complaint,
}) => {
	return (
		<Section icon={<FileText className='size-4' />} title='Detalle del reclamo'>
			<div className='space-y-3'>
				{complaint.itemType && (
					<InfoRow
						label='Tipo de bien'
						value={ITEM_TYPE_LABEL[complaint.itemType] ?? complaint.itemType}
					/>
				)}
				{complaint.itemDescription && (
					<InfoRow label='Bien contratado' value={complaint.itemDescription} />
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
							complaint.proofOfPaymentType && complaint.proofOfPaymentNumber
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
			</div>
		</Section>
	)
}
