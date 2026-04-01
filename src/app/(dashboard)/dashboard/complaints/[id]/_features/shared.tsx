import { differenceInCalendarDays } from 'date-fns'
import type { FC } from 'react'
import { AUDIT_LOG } from '@/lib/audit-actions'
import { cn } from '@/lib/utils'

// ── Labels ────────────────────────────────────────────────────────────────────

export const COMPLAINT_TYPE_LABEL: Record<string, string> = {
	complaint: 'Queja',
	claim: 'Reclamo',
}

export const COMPLAINT_STATUS_LABEL: Record<string, string> = {
	open: 'Abierto',
	in_progress: 'En proceso',
	in_review: 'En revisión',
	resolved: 'Resuelto',
	closed: 'Cerrado',
}

export const ITEM_TYPE_LABEL: Record<string, string> = {
	product: 'Producto',
	service: 'Servicio',
}

export const DOCUMENT_TYPE_LABEL: Record<string, string> = {
	dni: 'DNI',
	ce: 'Carné de Extranjería',
	passport: 'Pasaporte',
	ruc: 'RUC',
}

export const STATUS_BADGE_VARIANT: Record<
	string,
	'default' | 'secondary' | 'destructive' | 'outline'
> = {
	open: 'default',
	in_progress: 'outline',
	in_review: 'outline',
	resolved: 'secondary',
	closed: 'secondary',
}

export const AUDIT_ACTION_LABEL: Record<string, string> = {
	[AUDIT_LOG.COMPLAINT_RESPONDED]: 'Respuesta registrada',
	[AUDIT_LOG.COMPLAINT_SUBMITTED]: 'Reclamo creado',
	[AUDIT_LOG.COMPLAINT_STATUS_CHANGED]: 'Estado actualizado',
	[AUDIT_LOG.COMPLAINT_TRACKING_VIEWED]: 'Seguimiento consultado',
	[AUDIT_LOG.COMPLAINT_RECEIPT_DELIVERY_FAILED]: 'Error al enviar constancia',
	[AUDIT_LOG.COMPLAINT_RESPONSE_DELIVERY_FAILED]: 'Error al enviar respuesta',
	[AUDIT_LOG.COMPLAINT_AI_CLASSIFIED]: 'Clasificación IA aplicada',
	[AUDIT_LOG.COMPLAINT_AI_CLASSIFICATION_FAILED]: 'Error en clasificación IA',
	'complaint.updated': 'Información actualizada',
}

// ── Deadline helpers ──────────────────────────────────────────────────────────

export interface DeadlineStatus {
	daysRemaining: number
	label: string
	level: 'safe' | 'warning' | 'critical' | 'overdue'
}

export const getDeadlineStatus = (
	responseDeadline: Date | null,
	status: string,
): DeadlineStatus | null => {
	const activeStatuses = new Set(['open', 'in_progress', 'in_review'])
	if (!responseDeadline || !activeStatuses.has(status)) return null

	const days = differenceInCalendarDays(responseDeadline, new Date())

	if (days < 0)
		return {
			daysRemaining: days,
			label: `Venció hace ${Math.abs(days)} día${Math.abs(days) === 1 ? '' : 's'}`,
			level: 'overdue',
		}
	if (days === 0)
		return { daysRemaining: 0, label: 'Vence hoy', level: 'critical' }
	if (days <= 2)
		return {
			daysRemaining: days,
			label: `Vence en ${days} día${days === 1 ? '' : 's'}`,
			level: 'critical',
		}
	if (days <= 5)
		return {
			daysRemaining: days,
			label: `Vence en ${days} días`,
			level: 'warning',
		}
	return {
		daysRemaining: days,
		label: `${days} días restantes`,
		level: 'safe',
	}
}

// ── UI Primitives ─────────────────────────────────────────────────────────────

export const Section: FC<{
	icon: React.ReactNode
	title: string
	children: React.ReactNode
	className?: string
}> = ({ icon, title, children, className }) => (
	<div className={cn('rounded-xl border bg-card', className)}>
		<div className='flex items-center gap-2 px-4 py-3 border-b'>
			<span className='text-muted-foreground'>{icon}</span>
			<h2 className='text-sm font-semibold'>{title}</h2>
		</div>
		<div className='px-4 py-4'>{children}</div>
	</div>
)

export const InfoRow: FC<{
	label: React.ReactNode
	value: React.ReactNode
}> = ({ label, value }) => (
	<div className='flex flex-col gap-0.5 sm:flex-row sm:gap-4'>
		<span className='text-xs text-muted-foreground shrink-0 sm:w-36'>
			{label}
		</span>
		<span className='text-sm font-medium wrap-break-word'>
			{value ?? '—'}
		</span>
	</div>
)
