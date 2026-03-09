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
import {
	Check,
	ChevronDown,
	Loader2,
	Search,
	SearchAlert,
	TextSearch,
	X,
} from 'lucide-react'
import {
	type FC,
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useImperativeHandle,
	useRef,
	useState,
} from 'react'

import { InputGroup } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { useDebounce } from '@/hooks/use-debounce'
import type { FormFieldProps } from '@/hooks/use-form'
import { cn } from '@/lib/utils'

export interface AutocompleteOption {
	value: string
	label: string
}

export interface AutocompleteFieldProps
	extends FormFieldProps<AutocompleteOption | null> {
	label?: ReactNode
	placeholder?: string
	searchPlaceholder?: string
	emptyMessage?: string
	onSearch: (query: string) => Promise<AutocompleteOption[]>
	onSelect?: (option: AutocompleteOption | null) => void
	className?: string
	disabled?: boolean
}

const AutocompleteField: FC<AutocompleteFieldProps> = ({
	label,
	placeholder = 'Selecciona una opcion',
	searchPlaceholder = 'Buscar...',
	emptyMessage = 'No se encontraron resultados.',
	value,
	ref,
	onValueChange,
	onSearch,
	onSelect,
	className,
	disabled = false,
	validate,
}) => {
	const [isOpen, setIsOpen] = useState(false)
	const [query, setQuery] = useState('')
	const [options, setOptions] = useState<AutocompleteOption[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [highlightedIndex, setHighlightedIndex] = useState(0)
	const [error, setError] = useState<string | null>(null)

	const triggerId = useId()
	const listboxId = useId()
	const inputRef = useRef<HTMLInputElement>(null)
	const requestIdRef = useRef(0)
	const debouncedQuery = useDebounce(query, 350)
	const hasError = Boolean(error)

	// Stable ref for onSearch — keeps fetchOptions stable regardless of parent re-renders
	const onSearchRef = useRef(onSearch)
	useEffect(() => {
		onSearchRef.current = onSearch
	}, [onSearch])

	// Refs for cached default options — avoids state updates and effect re-runs for cached data
	const defaultOptionsRef = useRef<AutocompleteOption[]>([])
	const hasPrefetchedDefaultRef = useRef(false)
	// Ref mirror of isLoading for use in callbacks without adding it to deps
	const isLoadingRef = useRef(false)

	const { refs, floatingStyles, context } = useFloating({
		open: isOpen,
		onOpenChange: setIsOpen,
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

	// Empty deps — stable identity guaranteed via refs for all external dependencies
	const fetchOptions = useCallback(
		async ({
			searchTerm,
			cacheAsDefault = false,
			updateVisibleOptions = true,
		}: {
			searchTerm: string
			cacheAsDefault?: boolean
			updateVisibleOptions?: boolean
		}) => {
			const requestId = ++requestIdRef.current
			isLoadingRef.current = true
			setIsLoading(true)

			try {
				const results = await onSearchRef.current(searchTerm)
				if (requestId !== requestIdRef.current) return

				if (cacheAsDefault) {
					defaultOptionsRef.current = results
					hasPrefetchedDefaultRef.current = true
				}

				if (updateVisibleOptions) {
					setOptions(results)
					setHighlightedIndex(0)
				}
			} catch (fetchError) {
				if (requestId !== requestIdRef.current) return
				console.error('Autocomplete search error:', fetchError)

				if (cacheAsDefault) {
					defaultOptionsRef.current = []
					hasPrefetchedDefaultRef.current = true
				}
				if (updateVisibleOptions) {
					setOptions([])
				}
			} finally {
				if (requestId === requestIdRef.current) {
					isLoadingRef.current = false
					setIsLoading(false)
				}
			}
		},
		[],
	)

	const prefetchDefaultOptions = useCallback(() => {
		if (disabled || hasPrefetchedDefaultRef.current || isLoadingRef.current)
			return
		void fetchOptions({
			searchTerm: '',
			cacheAsDefault: true,
			updateVisibleOptions: false,
		})
	}, [disabled, fetchOptions])

	useImperativeHandle(ref, () => ({
		focus: () => {
			setIsOpen(true)
		},
		validate: () => {
			if (!validate) return null

			const validationError = validate(value ?? null)
			setError(validationError)
			return validationError
		},
	}))

	// Focus search input when dropdown opens and reset query
	useEffect(() => {
		if (!isOpen) return

		setQuery('')
		const timer = setTimeout(() => inputRef.current?.focus(), 0)
		return () => clearTimeout(timer)
	}, [isOpen])

	// Load options when dropdown opens or query returns to empty
	useEffect(() => {
		if (!isOpen) return
		if (query.trim()) return

		if (hasPrefetchedDefaultRef.current) {
			setOptions(defaultOptionsRef.current)
			setHighlightedIndex(0)
			return
		}

		void fetchOptions({
			searchTerm: '',
			cacheAsDefault: true,
			updateVisibleOptions: true,
		})
	}, [isOpen, query, fetchOptions])

	// Search when debounced query has a value
	useEffect(() => {
		if (!isOpen) return

		const searchTerm = debouncedQuery.trim()
		if (!searchTerm) return

		void fetchOptions({ searchTerm, updateVisibleOptions: true })
	}, [debouncedQuery, isOpen, fetchOptions])

	const handleSelect = (option: AutocompleteOption) => {
		onValueChange?.(option)
		onSelect?.(option)
		setIsOpen(false)
		setQuery('')

		if (error && validate) {
			setError(validate(option))
		}
	}

	const handleClear = () => {
		onValueChange?.(null)
		onSelect?.(null)
		setQuery('')
		setHighlightedIndex(0)

		if (error && validate) {
			setError(validate(null))
		}
	}

	const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Escape') {
			e.preventDefault()
			setIsOpen(false)
			return
		}

		if (!options.length) return

		if (e.key === 'ArrowDown') {
			e.preventDefault()
			setHighlightedIndex((prev) => (prev + 1) % options.length)
			return
		}

		if (e.key === 'ArrowUp') {
			e.preventDefault()
			setHighlightedIndex((prev) =>
				prev === 0 ? options.length - 1 : prev - 1,
			)
			return
		}

		if (e.key === 'Enter') {
			e.preventDefault()
			const option = options[highlightedIndex]
			if (option) {
				handleSelect(option)
			}
		}
	}

	return (
		<div className={cn('w-full space-y-1', className)}>
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
					aria-controls={listboxId}
					aria-invalid={hasError}
					data-slot='input-group-control'
					onMouseEnter={prefetchDefaultOptions}
					onFocus={prefetchDefaultOptions}
					onClick={() => {
						if (!disabled) setIsOpen(true)
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
							return
						}
						if (e.key === 'Escape' && isOpen) {
							e.preventDefault()
							setIsOpen(false)
						}
					}}
					className={cn(
						'flex h-full w-full items-center justify-between bg-transparent px-4 text-sm outline-none',
						'cursor-pointer',
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
								aria-label='Limpiar seleccion'
							>
								<X className='h-3.5 w-3.5' />
							</button>
						)}
						<ChevronDown className='h-4 w-4 text-muted-foreground' />
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
					<div className='border-b border-border/80 p-2'>
						<div className='flex items-center gap-2 rounded-lg border border-input bg-background px-2.5 py-1.5'>
							{isLoading ? (
								<Loader2 className='h-4 w-4 shrink-0 animate-spin text-muted-foreground' />
							) : (
								<Search className='h-4 w-4 shrink-0 text-muted-foreground' />
							)}
							<input
								ref={inputRef}
								type='text'
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								onKeyDown={handleInputKeyDown}
								placeholder={searchPlaceholder}
								className='w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground'
							/>
						</div>
					</div>

					<div
						id={listboxId}
						role='listbox'
						className='max-h-64 overflow-y-auto p-1'
					>
						{isLoading && options.length === 0 && (
							<div className='flex items-center justify-center py-8 text-sm text-muted-foreground'>
								Cargando...
							</div>
						)}

						{options.length === 0 && query !== '' && !isLoading && (
							<div className='flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground'>
								<SearchAlert className='h-5 w-5' />
								{emptyMessage}
							</div>
						)}

						{options.length === 0 && query === '' && (
							<div className='flex items-center justify-center py-8 text-sm text-muted-foreground'>
								<TextSearch />
							</div>
						)}

						{options.map((option, index) => (
							<button
								type='button'
								key={option.value}
								onClick={() => handleSelect(option)}
								onMouseEnter={() => setHighlightedIndex(index)}
								className={cn(
									'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
									'hover:bg-accent hover:text-accent-foreground',
									'focus:bg-accent focus:text-accent-foreground focus:outline-none',
									index === highlightedIndex &&
										'bg-accent text-accent-foreground',
								)}
							>
								<span className='truncate'>{option.label}</span>
								{value?.value === option.value && (
									<Check className='h-4 w-4 shrink-0' />
								)}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	)
}

AutocompleteField.displayName = 'AutocompleteField'

export default AutocompleteField
