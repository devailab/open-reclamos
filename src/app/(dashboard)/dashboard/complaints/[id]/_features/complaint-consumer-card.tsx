import { Mail, MapPin, Phone, User } from 'lucide-react'
import type { FC } from 'react'
import { Separator } from '@/components/ui/separator'
import type { ComplaintDetail } from '@/modules/complaints/detail-queries'
import { DOCUMENT_TYPE_LABEL, InfoRow, Section } from './shared'

interface ComplaintConsumerCardProps {
	complaint: ComplaintDetail
}

export const ComplaintConsumerCard: FC<ComplaintConsumerCardProps> = ({
	complaint,
}) => {
	return (
		<Section
			icon={<User className='size-4' />}
			title='Datos del consumidor'
		>
			<div className='space-y-3'>
				<InfoRow
					label='Nombre completo'
					value={`${complaint.firstName} ${complaint.lastName}`}
				/>
				{complaint.personType === 'juridical' &&
					complaint.legalName && (
						<InfoRow
							label='Razón social'
							value={complaint.legalName}
						/>
					)}
				<InfoRow
					label='Documento'
					value={`${DOCUMENT_TYPE_LABEL[complaint.documentType] ?? complaint.documentType} — ${complaint.documentNumber}`}
				/>

				{complaint.isMinor && (
					<>
						<Separator />
						<p className='text-xs text-amber-600 font-medium'>
							Menor de edad — datos del tutor/apoderado:
						</p>
						<InfoRow
							label='Tutor'
							value={
								complaint.guardianFirstName &&
								complaint.guardianLastName
									? `${complaint.guardianFirstName} ${complaint.guardianLastName}`
									: null
							}
						/>
						<InfoRow
							label='Doc. tutor'
							value={
								complaint.guardianDocumentType &&
								complaint.guardianDocumentNumber
									? `${DOCUMENT_TYPE_LABEL[complaint.guardianDocumentType] ?? complaint.guardianDocumentType} — ${complaint.guardianDocumentNumber}`
									: null
							}
						/>
					</>
				)}

				<Separator />

				<InfoRow
					label={
						<span className='flex items-center gap-1'>
							<Mail className='size-3' />
							Correo
						</span>
					}
					value={complaint.email}
				/>
				{complaint.phone && (
					<InfoRow
						label={
							<span className='flex items-center gap-1'>
								<Phone className='size-3' />
								Teléfono
							</span>
						}
						value={`${complaint.dialCode ?? ''} ${complaint.phone}`.trim()}
					/>
				)}
				{complaint.address && (
					<InfoRow
						label={
							<span className='flex items-center gap-1'>
								<MapPin className='size-3' />
								Dirección
							</span>
						}
						value={complaint.address}
					/>
				)}
			</div>
		</Section>
	)
}
