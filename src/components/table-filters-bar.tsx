'use client'

import { Filter, Search, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '@/components/ui/drawer'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip'

interface TableFiltersBarProps {
	primaryFilters: ReactNode[]
	advancedFilters?: ReactNode[]
	onSearch: () => void
	onClear: () => void
	hasActiveFilters: boolean
	searchLabel?: string
	advancedFiltersLabel?: string
}

export default function TableFiltersBar({
	primaryFilters,
	advancedFilters = [],
	onSearch,
	onClear,
	hasActiveFilters,
	searchLabel = 'Buscar',
	advancedFiltersLabel = 'Filtros avanzados',
}: TableFiltersBarProps) {
	const hasAdvancedFilters = advancedFilters.length > 0

	return (
		<div className='space-y-3'>
			<div className='flex flex-wrap items-start gap-3'>
				{primaryFilters.map((filter, index) => (
					<div
						key={`primary-filter-${index}`}
						className='min-w-0 flex-1 basis-56'
					>
						{filter}
					</div>
				))}

				{hasAdvancedFilters &&
					advancedFilters.map((filter, index) => (
						<div
							key={`advanced-filter-desktop-${index}`}
							className='hidden min-w-0 flex-1 basis-56 md:block'
						>
							{filter}
						</div>
					))}

				<div className='flex w-full items-center justify-end gap-2 sm:w-auto'>
					{hasAdvancedFilters && (
						<Drawer>
							<DrawerTrigger asChild>
								<Button
									type='button'
									variant='outline'
									size='sm'
									className='md:hidden'
								>
									<Filter className='h-4 w-4' />
									{advancedFiltersLabel}
								</Button>
							</DrawerTrigger>
							<DrawerContent>
								<DrawerHeader>
									<DrawerTitle>Filtros avanzados</DrawerTitle>
									<DrawerDescription>
										Ajusta filtros adicionales para mejorar
										la busqueda.
									</DrawerDescription>
								</DrawerHeader>
								<div className='space-y-3 px-4'>
									{advancedFilters.map((filter, index) => (
										<div
											key={`advanced-filter-mobile-${index}`}
										>
											{filter}
										</div>
									))}
								</div>
								<DrawerFooter>
									<DrawerClose asChild>
										<Button type='button' variant='outline'>
											Listo
										</Button>
									</DrawerClose>
								</DrawerFooter>
							</DrawerContent>
						</Drawer>
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

					<Button type='button' size='sm' onClick={onSearch}>
						<Search className='h-4 w-4' />
						{searchLabel}
					</Button>
				</div>
			</div>
		</div>
	)
}
