'use client'

import { ChevronLeft, ChevronRight, LayoutGrid, Store } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import type { SidebarComplaintsStores as SidebarComplaintsStoresEntry } from '@/lib/sidebar-navigation'
import type { StoreOption } from '@/modules/complaints/dashboard-queries'
import {
	buildComplaintsStorePath,
	getComplaintsStoreIdFromPath,
} from '@/modules/complaints/routes'

const STORES_PER_PAGE = 5

export function SidebarComplaintsStores({
	entry,
	stores,
	pathname,
}: {
	entry: SidebarComplaintsStoresEntry
	stores: StoreOption[]
	pathname: string
}) {
	const activeStoreId = getComplaintsStoreIdFromPath(pathname)
	const isGroupActive =
		pathname === entry.href || pathname.startsWith(`${entry.href}/`)

	const totalPages = Math.max(1, Math.ceil(stores.length / STORES_PER_PAGE))
	const activeStorePage = useMemo(() => {
		if (!activeStoreId) return 0
		const index = stores.findIndex((store) => store.id === activeStoreId)
		return index < 0 ? 0 : Math.floor(index / STORES_PER_PAGE)
	}, [activeStoreId, stores])

	const [isOpen, setIsOpen] = useState(isGroupActive)
	const [page, setPage] = useState(activeStorePage)

	useEffect(() => {
		if (isGroupActive) setIsOpen(true)
	}, [isGroupActive])

	useEffect(() => {
		setPage(activeStorePage)
	}, [activeStorePage])

	const safePage = Math.min(page, totalPages - 1)
	const visibleStores = stores.slice(
		safePage * STORES_PER_PAGE,
		safePage * STORES_PER_PAGE + STORES_PER_PAGE,
	)

	return (
		<SidebarMenuItem>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<CollapsibleTrigger
					render={
						<SidebarMenuButton tooltip={entry.label}>
							<entry.icon />
							<span>{entry.label}</span>
							<ChevronRight className='ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90' />
						</SidebarMenuButton>
					}
				/>
				<CollapsibleContent>
					<SidebarMenuSub>
						<SidebarMenuSubItem>
							<SidebarMenuSubButton
								render={<Link href={entry.href} />}
								isActive={pathname === entry.href}
							>
								<LayoutGrid />
								<span>Vista general</span>
							</SidebarMenuSubButton>
						</SidebarMenuSubItem>
						{visibleStores.map((store) => (
							<SidebarMenuSubItem key={store.id}>
								<SidebarMenuSubButton
									render={
										<Link
											href={buildComplaintsStorePath(
												store.id,
											)}
										/>
									}
									isActive={store.id === activeStoreId}
								>
									<Store />
									<span>{store.name}</span>
								</SidebarMenuSubButton>
							</SidebarMenuSubItem>
						))}

						{totalPages > 1 && (
							<SidebarMenuSubItem>
								<div className='flex items-center justify-between gap-1 px-2 py-1'>
									<span className='text-xs text-muted-foreground'>
										{safePage + 1} / {totalPages}
									</span>
									<div className='flex items-center gap-1'>
										<Button
											type='button'
											variant='ghost'
											size='icon-xs'
											aria-label='Tiendas anteriores'
											disabled={safePage === 0}
											onClick={() =>
												setPage((current) =>
													Math.max(0, current - 1),
												)
											}
										>
											<ChevronLeft />
										</Button>
										<Button
											type='button'
											variant='ghost'
											size='icon-xs'
											aria-label='Tiendas siguientes'
											disabled={
												safePage >= totalPages - 1
											}
											onClick={() =>
												setPage((current) =>
													Math.min(
														totalPages - 1,
														current + 1,
													),
												)
											}
										>
											<ChevronRight />
										</Button>
									</div>
								</div>
							</SidebarMenuSubItem>
						)}
					</SidebarMenuSub>
				</CollapsibleContent>
			</Collapsible>
		</SidebarMenuItem>
	)
}
