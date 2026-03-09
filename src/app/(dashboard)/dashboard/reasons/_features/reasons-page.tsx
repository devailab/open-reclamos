'use client'

import { BookOpen, Plus } from 'lucide-react'
import { type FC, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import { Button } from '@/components/ui/button'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty'
import { feedback } from '@/lib/feedback'
import { $deleteReasonAction } from '@/modules/reasons/actions'
import { CreateReasonDialog } from './create-reason-dialog'
import { EditReasonDialog } from './edit-reason-dialog'
import { ReasonsTree } from './reasons-tree'
import type { ReasonNode, ReasonRow } from './types'
import { buildReasonTree } from './types'

interface ReasonsPageProps {
	reasons: ReasonRow[]
}

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

export const ReasonsPage: FC<ReasonsPageProps> = ({ reasons }) => {
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
				if (!confirmed) return

				startDeleteTransition(async () => {
					const result = await $deleteReasonAction(node.id)
					if ('error' in result) {
						sileo.error({
							title: 'Error al eliminar',
							description: result.error,
						})
						return
					}
					sileo.success({ title: 'Motivo eliminado' })
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
				<Button onClick={handleAddRoot} disabled={isDeleting}>
					<Plus />
					Nuevo motivo
				</Button>
			</div>

			{tree.length === 0 ? (
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
				onSuccess={() => setCreateDialog(CLOSED_CREATE_DIALOG)}
			/>

			<EditReasonDialog
				reason={editingReason}
				onClose={() => setEditingReason(null)}
				onSuccess={() => setEditingReason(null)}
			/>
		</div>
	)
}
