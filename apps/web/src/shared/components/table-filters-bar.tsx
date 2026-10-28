'use client'

import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { type ReactNode, useId, useState } from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from '@/shared/components/ui/drawer'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/shared/components/ui/tooltip'
import { useIsMobile } from '@/shared/hooks/use-mobile'
import { cn } from '@/shared/lib/utils'

interface TableFiltersBarProps {
	primaryFilters: ReactNode[]
	advancedFilters?: ReactNode[]
	// Cantidad de filtros avanzados aplicados; se muestra aunque el panel esté cerrado.
	activeAdvancedCount?: number
	onSearch: () => void
	onClear: () => void
	hasActiveFilters: boolean
	searchLabel?: string
	advancedFiltersLabel?: string
}

// Filtros base siempre visibles y avanzados ocultos por defecto: panel en línea
// en escritorio y hoja inferior en móvil.
export default function TableFiltersBar({
	primaryFilters,
	advancedFilters = [],
	activeAdvancedCount = 0,
	onSearch,
	onClear,
	hasActiveFilters,
	searchLabel = 'Buscar',
	advancedFiltersLabel = 'Más filtros',
}: TableFiltersBarProps) {
	const [advancedOpen, setAdvancedOpen] = useState(false)
	const isMobile = useIsMobile()
	const panelId = useId()
	const hasAdvancedFilters = advancedFilters.length > 0

	const applyFromDrawer = () => {
		setAdvancedOpen(false)
		onSearch()
	}

	const clearFromDrawer = () => {
		setAdvancedOpen(false)
		onClear()
	}

	return (
		<div className='space-y-3'>
			<div className='flex flex-wrap items-end gap-3'>
				{primaryFilters.map((filter, index) => (
					<div
						key={`primary-filter-${index}`}
						className={cn(
							'min-w-0 flex-1 sm:basis-56',
							index === 0
								? 'basis-full'
								: 'basis-[calc(50%-0.375rem)]',
						)}
					>
						{filter}
					</div>
				))}

				<div className='flex w-full items-end justify-end gap-2 sm:w-auto sm:self-end'>
					{hasAdvancedFilters && (
						<Button
							type='button'
							variant={advancedOpen ? 'secondary' : 'outline'}
							className='mr-auto sm:mr-0'
							aria-expanded={advancedOpen}
							aria-controls={
								advancedOpen && !isMobile ? panelId : undefined
							}
							onClick={() => setAdvancedOpen((open) => !open)}
						>
							<SlidersHorizontal className='h-4 w-4' />
							{advancedFiltersLabel}
							{activeAdvancedCount > 0 && (
								<Badge className='ml-0.5 h-5 min-w-5 px-1.5'>
									{activeAdvancedCount}
									<span className='sr-only'>
										{activeAdvancedCount === 1
											? 'filtro activo'
											: 'filtros activos'}
									</span>
								</Badge>
							)}
							<ChevronDown
								className={cn(
									'hidden h-4 w-4 transition-transform md:block',
									advancedOpen && 'rotate-180',
								)}
							/>
						</Button>
					)}

					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									type='button'
									variant='outline'
									size='icon'
									onClick={onClear}
									disabled={!hasActiveFilters}
									aria-label='Limpiar filtros'
								>
									<X className='h-4 w-4' />
								</Button>
							}
						/>
						<TooltipContent side='top'>
							Limpiar filtros
						</TooltipContent>
					</Tooltip>

					<Button type='button' size='default' onClick={onSearch}>
						<Search className='h-4 w-4' />
						{searchLabel}
					</Button>
				</div>
			</div>

			{hasAdvancedFilters && advancedOpen && !isMobile && (
				<section
					id={panelId}
					aria-label={advancedFiltersLabel}
					className='grid gap-3 rounded-lg border bg-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
				>
					{advancedFilters.map((filter, index) => (
						<div
							key={`advanced-filter-desktop-${index}`}
							className='min-w-0'
						>
							{filter}
						</div>
					))}
				</section>
			)}

			{hasAdvancedFilters && (
				<Drawer
					open={advancedOpen && isMobile}
					onOpenChange={setAdvancedOpen}
				>
					<DrawerContent>
						<DrawerHeader>
							<DrawerTitle>{advancedFiltersLabel}</DrawerTitle>
							<DrawerDescription>
								Ajusta filtros adicionales para afinar la
								búsqueda.
							</DrawerDescription>
						</DrawerHeader>
						<div className='max-h-[60vh] space-y-3 overflow-y-auto px-4'>
							{advancedFilters.map((filter, index) => (
								<div key={`advanced-filter-mobile-${index}`}>
									{filter}
								</div>
							))}
						</div>
						<DrawerFooter className='flex-row'>
							<Button
								type='button'
								variant='outline'
								className='flex-1'
								onClick={clearFromDrawer}
								disabled={!hasActiveFilters}
							>
								Limpiar
							</Button>
							<Button
								type='button'
								className='flex-1'
								onClick={applyFromDrawer}
							>
								Aplicar
							</Button>
						</DrawerFooter>
					</DrawerContent>
				</Drawer>
			)}
		</div>
	)
}
