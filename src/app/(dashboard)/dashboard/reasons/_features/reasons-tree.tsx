'use client'

import { ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { type FC, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ReasonNode } from './types'

interface ReasonsTreeProps {
	nodes: ReasonNode[]
	onAddChild: (parentId: string, parentReason: string) => void
	onEdit: (node: ReasonNode) => void
	onDelete: (node: ReasonNode) => void
	depth?: number
}

export const ReasonsTree: FC<ReasonsTreeProps> = ({
	nodes,
	onAddChild,
	onEdit,
	onDelete,
	depth = 0,
}) => {
	if (nodes.length === 0) return null

	return (
		<ul
			className={cn(
				'space-y-0.5',
				depth > 0 && 'ml-4 border-l border-border/60 pl-4 mt-0.5',
			)}
		>
			{nodes.map((node) => (
				<ReasonNodeItem
					key={node.id}
					node={node}
					onAddChild={onAddChild}
					onEdit={onEdit}
					onDelete={onDelete}
					depth={depth}
				/>
			))}
		</ul>
	)
}

interface ReasonNodeItemProps {
	node: ReasonNode
	onAddChild: (parentId: string, parentReason: string) => void
	onEdit: (node: ReasonNode) => void
	onDelete: (node: ReasonNode) => void
	depth: number
}

const ReasonNodeItem: FC<ReasonNodeItemProps> = ({
	node,
	onAddChild,
	onEdit,
	onDelete,
	depth,
}) => {
	const [expanded, setExpanded] = useState(true)
	const hasChildren = node.children.length > 0
	const isRoot = depth === 0

	return (
		<li>
			<div
				className={cn(
					'group flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60',
					isRoot && 'font-medium',
				)}
			>
				{/* Botón expandir/colapsar */}
				<button
					type='button'
					onClick={() => setExpanded((prev) => !prev)}
					className={cn(
						'flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-all hover:text-foreground',
						!hasChildren && 'invisible pointer-events-none',
						expanded && hasChildren && 'rotate-90',
					)}
					aria-label={expanded ? 'Colapsar' : 'Expandir'}
				>
					<ChevronRight className='size-3.5' />
				</button>

				{/* Indicador de profundidad */}
				{!isRoot && (
					<span className='size-1.5 shrink-0 rounded-full bg-muted-foreground/40' />
				)}

				{/* Texto del motivo */}
				<span className='flex-1 truncate text-sm'>{node.reason}</span>

				{/* Contador de hijos */}
				{hasChildren && (
					<span className='shrink-0 text-xs text-muted-foreground tabular-nums opacity-0 transition-opacity group-hover:opacity-100'>
						{node.children.length}
					</span>
				)}

				{/* Acciones */}
				<div className='flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100'>
					{isRoot && (
						<Button
							size='icon-xs'
							variant='ghost'
							title='Agregar submotivo'
							onClick={() => onAddChild(node.id, node.reason)}
						>
							<Plus />
							<span className='sr-only'>Agregar submotivo</span>
						</Button>
					)}
					<Button
						size='icon-xs'
						variant='ghost'
						title='Editar'
						onClick={() => onEdit(node)}
					>
						<Pencil />
						<span className='sr-only'>Editar</span>
					</Button>
					<Button
						size='icon-xs'
						variant='ghost'
						title='Eliminar'
						className='text-destructive hover:bg-destructive/10 hover:text-destructive'
						onClick={() => onDelete(node)}
					>
						<Trash2 />
						<span className='sr-only'>Eliminar</span>
					</Button>
				</div>
			</div>

			{/* Hijos (recursivo) */}
			{hasChildren && expanded && (
				<ReasonsTree
					nodes={node.children}
					onAddChild={onAddChild}
					onEdit={onEdit}
					onDelete={onDelete}
					depth={depth + 1}
				/>
			)}
		</li>
	)
}
