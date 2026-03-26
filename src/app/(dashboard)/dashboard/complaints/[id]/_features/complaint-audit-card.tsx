import { Shield } from 'lucide-react'
import type { FC } from 'react'
import { Separator } from '@/components/ui/separator'
import { formatDateTimeDisplay } from '@/lib/formatters'
import type { ComplaintAuditEntry } from '@/modules/complaints/detail-queries'
import { AUDIT_ACTION_LABEL, Section } from './shared'

interface ComplaintAuditCardProps {
	auditHistory: ComplaintAuditEntry[]
}

export const ComplaintAuditCard: FC<ComplaintAuditCardProps> = ({
	auditHistory,
}) => {
	if (auditHistory.length === 0) return null

	return (
		<Section
			icon={<Shield className='size-4' />}
			title='Historial de acciones'
		>
			<div className='space-y-3'>
				{auditHistory.map((entry, i) => (
					<div key={entry.id}>
						{i > 0 && <Separator className='mb-3' />}
						<div className='flex items-start gap-3'>
							<div className='size-2 rounded-full bg-muted-foreground/40 shrink-0 mt-1.5' />
							<div className='min-w-0 flex-1'>
								<p className='text-sm font-medium'>
									{AUDIT_ACTION_LABEL[entry.action] ??
										entry.action}
								</p>
								<div className='flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground'>
									<span>
										{formatDateTimeDisplay(entry.createdAt)}
									</span>
									{entry.userName && (
										<span>por {entry.userName}</span>
									)}
								</div>
							</div>
						</div>
					</div>
				))}
			</div>
		</Section>
	)
}
