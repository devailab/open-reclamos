'use client'

import type { FC } from 'react'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { formatDateTimeDisplay } from '@/lib/formatters'
import type { AuditLogRow } from './types'

interface AuditLogDetailsDialogProps {
	log: AuditLogRow | null
	onClose: () => void
}

const formatJsonValue = (value: unknown): string => {
	if (value === null || value === undefined) return '—'

	try {
		return JSON.stringify(value, null, 2)
	} catch {
		return String(value)
	}
}

const formatOptionalText = (value: string | null | undefined): string => {
	return value?.trim() ? value : '—'
}

const DetailItem: FC<{ label: string; value: string }> = ({ label, value }) => {
	return (
		<div className='space-y-1'>
			<p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
				{label}
			</p>
			<p className='text-sm break-all'>{value}</p>
		</div>
	)
}

export function AuditLogDetailsDialog({
	log,
	onClose,
}: AuditLogDetailsDialogProps) {
	const open = log !== null

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
			<DialogContent className='sm:max-w-2xl'>
				<DialogHeader>
					<DialogTitle>Detalle del log de auditoría</DialogTitle>
				</DialogHeader>

				{log && (
					<div className='space-y-4'>
						<div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
							<DetailItem label='Acción' value={log.action} />
							<DetailItem
								label='Tipo de entidad'
								value={log.entityType}
							/>
							<DetailItem
								label='ID de entidad'
								value={formatOptionalText(log.entityId)}
							/>
							<DetailItem
								label='Fecha'
								value={formatDateTimeDisplay(log.createdAt)}
							/>
							<DetailItem
								label='Usuario'
								value={`${log.userName}${log.userEmail !== '—' ? ` (${log.userEmail})` : ''}`}
							/>
							<DetailItem
								label='IP'
								value={formatOptionalText(log.ipAddress)}
							/>
							<div className='sm:col-span-2'>
								<DetailItem
									label='User Agent'
									value={formatOptionalText(log.userAgent)}
								/>
							</div>
						</div>

						<Separator />

						<div className='space-y-2'>
							<p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
								Datos anteriores
							</p>
							<pre className='max-h-52 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed whitespace-pre-wrap break-all'>
								{formatJsonValue(log.oldData)}
							</pre>
						</div>

						<div className='space-y-2'>
							<p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
								Datos nuevos
							</p>
							<pre className='max-h-52 overflow-auto rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed whitespace-pre-wrap break-all'>
								{formatJsonValue(log.newData)}
							</pre>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}
