'use client'

import {
	CheckCircle2,
	FileText,
	MessageSquare,
	PenLine,
	Shield,
	StickyNote,
} from 'lucide-react'
import { type FC, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatDateTimeDisplay } from '@/lib/formatters'
import type {
	ComplaintAuditEntry,
	ComplaintHistoryEntry,
} from '@/modules/complaints/detail-queries'
import { AUDIT_ACTION_LABEL, COMPLAINT_STATUS_LABEL, Section } from './shared'

// ── Historia del reclamo (tabla complaint_history) ────────────────────────────

const EVENT_CONFIG: Record<
	string,
	{ label: string; icon: React.ElementType; color: string }
> = {
	complaint_created: {
		label: 'Reclamo registrado',
		icon: FileText,
		color: 'text-blue-600 bg-blue-50 ring-blue-200',
	},
	status_changed: {
		label: 'Estado actualizado',
		icon: PenLine,
		color: 'text-amber-600 bg-amber-50 ring-amber-200',
	},
	response_added: {
		label: 'Respuesta registrada',
		icon: MessageSquare,
		color: 'text-green-600 bg-green-50 ring-green-200',
	},
	note_added: {
		label: 'Nota agregada',
		icon: StickyNote,
		color: 'text-purple-600 bg-purple-50 ring-purple-200',
	},
}

const ROLE_LABEL: Record<string, string> = {
	system: 'Sistema',
	consumer: 'Consumidor',
	operator: 'Operador',
}

interface ComplaintHistoryCardProps {
	history: ComplaintHistoryEntry[]
	auditHistory: ComplaintAuditEntry[]
}

export const ComplaintAuditCard: FC<ComplaintHistoryCardProps> = ({
	history,
	auditHistory,
}) => {
	const [showAudit, setShowAudit] = useState(false)

	if (history.length === 0 && auditHistory.length === 0) return null

	return (
		<Section icon={<Shield className='size-4' />} title='Historial'>
			<div className='space-y-0'>
				{history.map((entry, i) => {
					const config = EVENT_CONFIG[entry.eventType] ?? {
						label: entry.eventType,
						icon: CheckCircle2,
						color: 'text-muted-foreground bg-muted ring-border',
					}
					const Icon = config.icon
					const isLast = i === history.length - 1

					return (
						<div key={entry.id} className='flex gap-3'>
							{/* Línea + icono */}
							<div className='flex flex-col items-center'>
								<span
									className={`flex size-7 shrink-0 items-center justify-center rounded-full ring-1 ${config.color}`}
								>
									<Icon className='size-3.5' />
								</span>
								{!isLast && (
									<div className='w-px flex-1 bg-border my-1' />
								)}
							</div>

							{/* Contenido */}
							<div
								className={`pb-4 min-w-0 flex-1 ${isLast ? 'pb-0' : ''}`}
							>
								<div className='flex flex-wrap items-center gap-2'>
									<p className='text-sm font-medium'>
										{config.label}
									</p>
									{entry.fromStatus && entry.toStatus && (
										<div className='flex items-center gap-1 text-xs text-muted-foreground'>
											<Badge
												variant='outline'
												className='text-[10px] px-1.5 py-0'
											>
												{COMPLAINT_STATUS_LABEL[
													entry.fromStatus
												] ?? entry.fromStatus}
											</Badge>
											<span>→</span>
											<Badge
												variant='outline'
												className='text-[10px] px-1.5 py-0'
											>
												{COMPLAINT_STATUS_LABEL[
													entry.toStatus
												] ?? entry.toStatus}
											</Badge>
										</div>
									)}
								</div>
								{entry.publicNote && (
									<p className='text-xs text-muted-foreground mt-0.5'>
										{entry.publicNote}
									</p>
								)}
								{entry.internalNote && (
									<p className='text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1'>
										<span className='font-medium'>
											Nota interna:
										</span>{' '}
										{entry.internalNote}
									</p>
								)}
								<div className='flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground'>
									<span>
										{formatDateTimeDisplay(entry.createdAt)}
									</span>
									{entry.performedByName ? (
										<span>por {entry.performedByName}</span>
									) : (
										<span>
											{ROLE_LABEL[
												entry.performedByRole
											] ?? entry.performedByRole}
										</span>
									)}
								</div>
							</div>
						</div>
					)
				})}
			</div>

			{/* Audit log colapsable (solo para operadores con contexto técnico) */}
			{auditHistory.length > 0 && (
				<div className='mt-3'>
					<Separator className='mb-3' />
					<Button
						variant='ghost'
						size='sm'
						className='h-7 text-xs text-muted-foreground px-2'
						onClick={() => setShowAudit((v) => !v)}
					>
						{showAudit ? 'Ocultar' : 'Ver'} registro de auditoría (
						{auditHistory.length})
					</Button>
					{showAudit && (
						<div className='mt-2 space-y-2'>
							{auditHistory.map((entry) => (
								<div
									key={entry.id}
									className='flex items-start gap-2.5'
								>
									<div className='size-1.5 rounded-full bg-muted-foreground/40 shrink-0 mt-1.5' />
									<div className='min-w-0 flex-1'>
										<p className='text-xs font-medium text-muted-foreground'>
											{AUDIT_ACTION_LABEL[entry.action] ??
												entry.action}
										</p>
										<div className='flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground/70'>
											<span>
												{formatDateTimeDisplay(
													entry.createdAt,
												)}
											</span>
											{entry.userName && (
												<span>
													por {entry.userName}
												</span>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</Section>
	)
}
