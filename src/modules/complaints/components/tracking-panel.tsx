'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
	AlertCircleIcon,
	CheckCircle2Icon,
	ClockIcon,
	SearchIcon,
	XCircleIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import {
	lookupComplaintByTrackingCodeAction,
	type TrackingResult,
} from '@/modules/complaints/tracking-actions'

const STATUS_CONFIG: Record<
	string,
	{
		label: string
		colorClass: string
		icon: React.ElementType
	}
> = {
	open: {
		label: 'Abierto',
		colorClass: 'text-blue-700 bg-blue-50 ring-blue-200',
		icon: ClockIcon,
	},
	in_progress: {
		label: 'En proceso',
		colorClass: 'text-amber-700 bg-amber-50 ring-amber-200',
		icon: AlertCircleIcon,
	},
	resolved: {
		label: 'Resuelto',
		colorClass: 'text-green-700 bg-green-50 ring-green-200',
		icon: CheckCircle2Icon,
	},
	closed: {
		label: 'Cerrado',
		colorClass: 'text-gray-600 bg-gray-100 ring-gray-200',
		icon: XCircleIcon,
	},
}

const TYPE_LABEL: Record<string, string> = {
	claim: 'Reclamo',
	complaint: 'Queja',
}

interface TrackingPanelProps {
	organizationId: string
}

export function TrackingPanel({ organizationId }: TrackingPanelProps) {
	const [open, setOpen] = useState(false)
	const [code, setCode] = useState('')
	const [result, setResult] = useState<TrackingResult | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [isPending, startTransition] = useTransition()

	const handleSearch = () => {
		if (!code.trim()) return
		setError(null)
		setResult(null)
		startTransition(async () => {
			const res = await lookupComplaintByTrackingCodeAction(
				code,
				organizationId,
			)
			if (res.success) {
				setResult(res.data)
			} else {
				setError(res.error)
			}
		})
	}

	const handleOpenChange = (next: boolean) => {
		setOpen(next)
		if (!next) {
			setCode('')
			setResult(null)
			setError(null)
		}
	}

	return (
		<>
			<div className='mt-6 flex justify-center'>
				<button
					type='button'
					onClick={() => setOpen(true)}
					className='text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline'
				>
					¿Ya presentaste un reclamo? Consulta su estado →
				</button>
			</div>

			<ResponsiveModal
				open={open}
				onOpenChange={handleOpenChange}
				title='Seguimiento de reclamo'
				description='Ingresa el código de seguimiento que recibiste al presentar tu reclamo.'
				className='sm:max-w-md'
			>
				<div className='space-y-4'>
					{/* Input de búsqueda */}
					<div className='flex gap-2'>
						<Input
							placeholder='Ej. A2B3-C4D5E6'
							value={code}
							onChange={(e) =>
								setCode(e.target.value.toUpperCase())
							}
							onKeyDown={(e) =>
								e.key === 'Enter' && handleSearch()
							}
							disabled={isPending}
							className='h-9 font-mono tracking-widest placeholder:font-sans placeholder:tracking-normal'
						/>
						<Button
							onClick={handleSearch}
							disabled={isPending || !code.trim()}
							className='h-9 px-3'
						>
							<SearchIcon className='size-4' />
							<span className='hidden sm:inline'>Buscar</span>
						</Button>
					</div>

					{/* Error */}
					{error && (
						<div className='flex items-start gap-2.5 rounded-lg bg-destructive/8 px-3 py-2.5 text-sm text-destructive'>
							<XCircleIcon className='mt-0.5 size-4 shrink-0' />
							<p>{error}</p>
						</div>
					)}

					{/* Resultado */}
					{result && <TrackingCard complaint={result} />}
				</div>
			</ResponsiveModal>
		</>
	)
}

function TrackingCard({ complaint }: { complaint: TrackingResult }) {
	const statusConfig = STATUS_CONFIG[complaint.status] ?? STATUS_CONFIG.open
	const StatusIcon = statusConfig.icon
	const typeLabel = TYPE_LABEL[complaint.type] ?? complaint.type

	const deadline = complaint.responseDeadline
		? new Date(complaint.responseDeadline)
		: null
	const isOverdue = deadline ? new Date() > deadline : false

	return (
		<div className='space-y-3'>
			{/* Encabezado: código + estado */}
			<div className='flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-4 py-3'>
				<div>
					<p className='text-[10px] font-medium uppercase tracking-wider text-muted-foreground'>
						Código de seguimiento
					</p>
					<p className='font-mono text-base font-semibold tracking-widest'>
						{complaint.trackingCode}
					</p>
				</div>
				<span
					className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusConfig.colorClass}`}
				>
					<StatusIcon className='size-3.5' />
					{statusConfig.label}
				</span>
			</div>

			{/* Detalles */}
			<div className='grid grid-cols-2 gap-3 rounded-xl border bg-muted/30 px-4 py-3 text-sm'>
				<div>
					<p className='text-[10px] font-medium uppercase tracking-wider text-muted-foreground'>
						N° de {typeLabel}
					</p>
					<p className='font-mono font-medium'>
						{complaint.correlative}
					</p>
				</div>
				<div>
					<p className='text-[10px] font-medium uppercase tracking-wider text-muted-foreground'>
						Tipo
					</p>
					<p className='font-medium'>{typeLabel}</p>
				</div>
				<div>
					<p className='text-[10px] font-medium uppercase tracking-wider text-muted-foreground'>
						Establecimiento
					</p>
					<p className='font-medium'>{complaint.storeName}</p>
				</div>
				<div>
					<p className='text-[10px] font-medium uppercase tracking-wider text-muted-foreground'>
						Fecha de presentación
					</p>
					<p className='font-medium'>
						{format(
							new Date(complaint.createdAt),
							"d 'de' MMM yyyy",
							{
								locale: es,
							},
						)}
					</p>
				</div>
			</div>

			{/* Plazo de respuesta */}
			{deadline && (
				<div
					className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs ${
						isOverdue
							? 'bg-destructive/8 text-destructive'
							: 'bg-muted text-muted-foreground'
					}`}
				>
					<ClockIcon className='size-3.5 shrink-0' />
					{isOverdue ? (
						<span>
							El plazo de respuesta venció el{' '}
							<strong>
								{format(deadline, "d 'de' MMMM 'de' yyyy", {
									locale: es,
								})}
							</strong>
							.
						</span>
					) : (
						<span>
							Plazo máximo de respuesta:{' '}
							<strong>
								{format(deadline, "d 'de' MMMM 'de' yyyy", {
									locale: es,
								})}
							</strong>
						</span>
					)}
				</div>
			)}
		</div>
	)
}
