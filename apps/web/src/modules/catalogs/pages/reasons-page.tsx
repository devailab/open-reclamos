import { PermissionAdmin } from '@open-reclamos/rpc-client'
import { BookOpen, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import { useSession } from '@/shared/auth/session'
import { Button } from '@/shared/components/ui/button'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/shared/components/ui/empty'
import { feedback } from '@/shared/lib/feedback'
import { deleteReason, listReasons } from '../features/reasons/api'
import { CreateReasonDialog } from '../features/reasons/create-reason-dialog'
import { EditReasonDialog } from '../features/reasons/edit-reason-dialog'
import { ReasonsTree } from '../features/reasons/reasons-tree'
import type { ReasonNode, ReasonRow } from '../features/reasons/types'
import { buildReasonTree } from '../features/reasons/types'

interface CreateDialogState {
	open: boolean
	parentId: string | null
	parentReason: string | null
}

const CLOSED_CREATE_DIALOG: CreateDialogState = {
	open: false,
	parentId: null,
	parentReason: null,
}

export function ReasonsPage() {
	const { session } = useSession()

	if (!session?.organization_id) {
		return <p role='status'>Selecciona una organización para continuar.</p>
	}

	return <ReasonsPageContent key={session.organization_id} />
}

function ReasonsPageContent() {
	const { session } = useSession()
	const canManage = session?.capabilities?.[PermissionAdmin] === true
	const [reasons, setReasons] = useState<ReasonRow[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const requestRef = useRef(0)

	const load = useCallback(async (signal?: AbortSignal) => {
		const request = ++requestRef.current

		setLoading(true)

		try {
			const rows = await listReasons(signal)

			if (signal?.aborted || request !== requestRef.current) {
				return
			}

			setReasons(rows)
			setError(null)
		} catch (error) {
			if (signal?.aborted || request !== requestRef.current) {
				return
			}

			setError(
				error instanceof Error
					? error.message
					: 'No se pudieron cargar los motivos',
			)
		} finally {
			if (!signal?.aborted && request === requestRef.current) {
				setLoading(false)
			}
		}
	}, [])

	useEffect(() => {
		const controller = new AbortController()

		void load(controller.signal)

		return () => controller.abort()
	}, [load])

	const tree = buildReasonTree(reasons)

	const [createDialog, setCreateDialog] =
		useState<CreateDialogState>(CLOSED_CREATE_DIALOG)

	const [editingReason, setEditingReason] = useState<ReasonNode | null>(null)
	const [isDeleting, startDeleteTransition] = useTransition()

	const handleAddRoot = () => {
		setCreateDialog({ open: true, parentId: null, parentReason: null })
	}

	const handleAddChild = (parentId: string, parentReason: string) => {
		setCreateDialog({ open: true, parentId, parentReason })
	}

	const handleDelete = (node: ReasonNode) => {
		const hasChildren = node.children.length > 0

		const description = hasChildren
			? `Se eliminará "${node.reason}" junto con sus ${node.children.length} submotivo(s). Esta acción no se puede deshacer.`
			: `Se eliminará "${node.reason}". Esta acción no se puede deshacer.`

		feedback
			.confirm({
				title: 'Eliminar motivo',
				description,
				confirmText: 'Eliminar',
				cancelText: 'Cancelar',
				variant: 'destructive',
			})
			.then((confirmed) => {
				if (!confirmed) {
					return
				}

				startDeleteTransition(async () => {
					const result = await deleteReason(node.id)

					if ('error' in result) {
						sileo.error({
							title: 'Error al eliminar',
							description: result.error,
						})

						return
					}

					sileo.success({ title: 'Motivo eliminado' })
					void load()
				})
			})
	}

	return (
		<div className='space-y-6'>
			<div className='flex items-start justify-between gap-4'>
				<div>
					<h1 className='text-2xl font-semibold'>
						Motivos de reclamo
					</h1>
					<p className='mt-1 text-sm text-muted-foreground'>
						Gestiona los motivos y submotivos disponibles al
						registrar un reclamo.
					</p>
				</div>
				<Button
					onClick={handleAddRoot}
					disabled={!canManage || isDeleting}
				>
					<Plus />
					Nuevo motivo
				</Button>
			</div>

			{error && (
				<p role='alert'>
					{error}
					<Button variant='outline' onClick={() => void load()}>
						Reintentar
					</Button>
				</p>
			)}
			{loading ? (
				<p role='status'>Cargando motivos...</p>
			) : tree.length === 0 ? (
				<Empty className='border py-16'>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<BookOpen />
						</EmptyMedia>
						<EmptyContent>
							<EmptyTitle>Sin motivos registrados</EmptyTitle>
							<EmptyDescription>
								Agrega el primer motivo de reclamo para
								comenzar.
							</EmptyDescription>
						</EmptyContent>
					</EmptyHeader>
				</Empty>
			) : (
				<div className='rounded-xl border bg-card'>
					<div className='border-b px-4 py-3'>
						<p className='text-sm text-muted-foreground'>
							{reasons.length}{' '}
							{reasons.length === 1 ? 'motivo' : 'motivos'} en
							total
						</p>
					</div>
					<div className='p-4'>
						<ReasonsTree
							nodes={tree}
							canManage={canManage}
							onAddChild={handleAddChild}
							onEdit={setEditingReason}
							onDelete={handleDelete}
						/>
					</div>
				</div>
			)}

			<CreateReasonDialog
				open={createDialog.open}
				onOpenChange={(open) =>
					setCreateDialog((prev) => ({ ...prev, open }))
				}
				parentId={createDialog.parentId}
				parentReason={createDialog.parentReason}
				onSuccess={() => {
					setCreateDialog(CLOSED_CREATE_DIALOG)
					void load()
				}}
			/>

			<EditReasonDialog
				reason={editingReason}
				onClose={() => setEditingReason(null)}
				onSuccess={() => {
					setEditingReason(null)
					void load()
				}}
			/>
		</div>
	)
}
