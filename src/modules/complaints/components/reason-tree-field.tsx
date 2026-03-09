'use client'

import {
	autoUpdate,
	flip,
	offset,
	size,
	useDismiss,
	useFloating,
	useInteractions,
	useRole,
} from '@floating-ui/react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import {
	type FC,
	useId,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from 'react'
import type { SelectOption } from '@/components/forms/select-field'
import { InputGroup } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import type { FormFieldProps } from '@/hooks/use-form'
import { cn } from '@/lib/utils'

export interface FlatReason {
	id: string
	reason: string
	parentId: string | null
}

interface ReasonNode {
	id: string
	reason: string
	children: FlatReason[]
}

export interface ReasonTreeFieldProps
	extends FormFieldProps<SelectOption | null> {
	reasons: FlatReason[]
	label?: string
	placeholder?: string
	disabled?: boolean
}

const buildTree = (reasons: FlatReason[]): ReasonNode[] => {
	const childrenByParent = new Map<string, FlatReason[]>()
	for (const r of reasons) {
		if (r.parentId) {
			const list = childrenByParent.get(r.parentId) ?? []
			list.push(r)
			childrenByParent.set(r.parentId, list)
		}
	}

	const nodes: ReasonNode[] = []
	for (const r of reasons) {
		if (r.parentId !== null) continue
		const children = childrenByParent.get(r.id) ?? []
		if (children.length === 0) continue
		nodes.push({ id: r.id, reason: r.reason, children })
	}
	return nodes
}

const ReasonTreeField: FC<ReasonTreeFieldProps> = ({
	reasons,
	label,
	placeholder = 'Selecciona un motivo',
	value,
	onValueChange,
	validate,
	ref,
	disabled,
}) => {
	const [isOpen, setIsOpen] = useState(false)
	const [search, setSearch] = useState('')
	const [error, setError] = useState<string | null>(null)
	const triggerId = useId()
	const searchRef = useRef<HTMLInputElement>(null)

	const tree = useMemo(() => buildTree(reasons), [reasons])

	const filteredTree = useMemo(() => {
		if (!search.trim()) return tree
		const q = search.toLowerCase()
		return tree
			.map((node) => ({
				...node,
				children: node.children.filter((c) =>
					c.reason.toLowerCase().includes(q),
				),
			}))
			.filter((node) => node.children.length > 0)
	}, [tree, search])

	const { refs, floatingStyles, context } = useFloating({
		open: isOpen,
		onOpenChange: (open) => {
			if (disabled) return
			setIsOpen(open)
			if (open) {
				setSearch('')
				setTimeout(() => searchRef.current?.focus(), 0)
			}
		},
		placement: 'bottom-start',
		middleware: [
			offset(6),
			flip(),
			size({
				apply({ rects, elements }) {
					Object.assign(elements.floating.style, {
						width: `${rects.reference.width}px`,
					})
				},
			}),
		],
		whileElementsMounted: autoUpdate,
	})

	const dismiss = useDismiss(context)
	const role = useRole(context, { role: 'listbox' })
	const { getFloatingProps } = useInteractions([dismiss, role])

	useImperativeHandle(ref, () => ({
		focus: () => {
			if (!disabled) setIsOpen(true)
		},
		validate: () => {
			const err = validate?.(value ?? null) ?? null
			setError(err)
			return err
		},
	}))

	const handleSelect = (reason: FlatReason) => {
		const opt: SelectOption = { value: reason.id, label: reason.reason }
		onValueChange?.(opt)
		setIsOpen(false)
		setSearch('')
		if (error) setError(validate?.(opt) ?? null)
	}

	const handleClear = () => {
		onValueChange?.(null)
		if (error) setError(validate?.(null) ?? null)
	}

	const hasError = Boolean(error)

	return (
		<div className='w-full space-y-1'>
			{label && (
				<Label
					htmlFor={triggerId}
					className={cn(hasError && 'text-destructive')}
				>
					{label}
				</Label>
			)}

			<InputGroup
				className={cn(
					hasError && 'border-destructive ring-destructive/20',
				)}
				data-disabled={disabled ? true : undefined}
			>
				<div
					id={triggerId}
					ref={refs.setReference}
					role='combobox'
					tabIndex={disabled ? -1 : 0}
					aria-expanded={isOpen}
					aria-invalid={hasError}
					data-slot='input-group-control'
					onClick={() => {
						if (!disabled) setIsOpen((prev) => !prev)
					}}
					onKeyDown={(e) => {
						if (disabled) return
						if (
							e.key === 'Enter' ||
							e.key === ' ' ||
							e.key === 'ArrowDown'
						) {
							e.preventDefault()
							setIsOpen(true)
						}
						if (e.key === 'Escape' && isOpen) {
							e.preventDefault()
							setIsOpen(false)
						}
					}}
					className={cn(
						'flex h-full w-full items-center justify-between bg-transparent px-4 text-sm outline-none cursor-pointer',
						disabled && 'cursor-not-allowed',
					)}
				>
					<span
						className={cn(
							'flex items-center truncate leading-normal',
							!value && 'text-muted-foreground',
						)}
					>
						{value?.label || placeholder}
					</span>

					<div className='flex items-center gap-1'>
						{value && (
							<button
								type='button'
								onClick={(e) => {
									e.preventDefault()
									e.stopPropagation()
									handleClear()
								}}
								className='rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground'
								aria-label='Limpiar selección'
							>
								<X className='h-3.5 w-3.5' />
							</button>
						)}
						<ChevronDown
							className={cn(
								'h-4 w-4 text-muted-foreground transition-transform duration-200',
								isOpen && 'rotate-180',
							)}
						/>
					</div>
				</div>
			</InputGroup>

			{hasError && error && (
				<p className='text-xs text-destructive'>{error}</p>
			)}

			{isOpen && (
				<div
					ref={refs.setFloating}
					style={floatingStyles}
					{...getFloatingProps()}
					className='z-50 overflow-hidden rounded-xl border border-border/80 bg-popover shadow-md'
				>
					{/* Búsqueda */}
					<div className='border-b border-border/80 p-2'>
						<div className='flex items-center gap-2 rounded-lg border border-input bg-background px-2.5 py-1.5'>
							<Search className='h-4 w-4 shrink-0 text-muted-foreground' />
							<input
								ref={searchRef}
								type='text'
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder='Buscar motivo...'
								className='w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground'
							/>
						</div>
					</div>

					{/* Árbol de motivos */}
					<div className='max-h-64 overflow-y-auto p-1'>
						{filteredTree.length === 0 ? (
							<p className='py-6 text-center text-sm text-muted-foreground'>
								No se encontraron motivos
							</p>
						) : (
							filteredTree.map((node) => (
								<div key={node.id} className='mb-1'>
									<p className='px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
										{node.reason}
									</p>
									{node.children.map((child) => {
										const isSelected =
											value?.value === child.id
										return (
											<button
												key={child.id}
												type='button'
												onClick={() =>
													handleSelect(child)
												}
												className={cn(
													'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
													'hover:bg-accent hover:text-accent-foreground',
													'focus:bg-accent focus:text-accent-foreground focus:outline-none',
													isSelected &&
														'bg-accent text-accent-foreground font-medium',
												)}
											>
												<span className='truncate'>
													{child.reason}
												</span>
												{isSelected && (
													<Check className='h-4 w-4 shrink-0' />
												)}
											</button>
										)
									})}
								</div>
							))
						)}
					</div>
				</div>
			)}
		</div>
	)
}

ReasonTreeField.displayName = 'ReasonTreeField'

export default ReasonTreeField
