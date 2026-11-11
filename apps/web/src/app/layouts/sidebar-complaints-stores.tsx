'use client'

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { SidebarComplaintsStores as SidebarComplaintsStoresEntry } from '@/app/layouts/sidebar-navigation'
import { IcArrowLeft02 } from '@/shared/components/icons/ic-arrow-left-02'
import { IcArrowRight02 } from '@/shared/components/icons/ic-arrow-right-02'
import { IcGrid1 } from '@/shared/components/icons/ic-grid-1'
import { IcShop } from '@/shared/components/icons/ic-shop'
import { Button } from '@/shared/components/ui/button'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/shared/components/ui/collapsible'
import {
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	useSidebar,
} from '@/shared/components/ui/sidebar'
import { cn } from '@/shared/lib/utils'
import type { StoreOption } from '../../modules/organizations/types'
import { SidebarFlyout, SidebarFlyoutLink } from './sidebar-flyout'
import { SidebarNavIcon } from './sidebar-nav-icon'
import {
	sidebarNavGroupClassName,
	sidebarNavSubItemClassName,
} from './sidebar-nav-styles'

function buildComplaintsStorePath(storeId: string) {
	return `/dashboard/complaints/stores/${encodeURIComponent(storeId)}`
}

function getComplaintsStoreIdFromPath(pathname: string) {
	return (
		pathname.match(/^\/dashboard\/complaints\/stores\/([^/]+)\/?$/)?.[1] ??
		null
	)
}

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
	const { state, isMobile } = useSidebar()

	const activeStoreId = getComplaintsStoreIdFromPath(pathname)

	const isGroupActive =
		pathname === entry.href || pathname.startsWith(`${entry.href}/`)

	const totalPages = Math.max(1, Math.ceil(stores.length / STORES_PER_PAGE))

	const activeStorePage = useMemo(() => {
		if (!activeStoreId) {
			return 0
		}

		const index = stores.findIndex((store) => store.id === activeStoreId)

		return index < 0 ? 0 : Math.floor(index / STORES_PER_PAGE)
	}, [activeStoreId, stores])

	const [isOpen, setIsOpen] = useState(isGroupActive)
	const [page, setPage] = useState(activeStorePage)

	useEffect(() => {
		if (isGroupActive) {
			setIsOpen(true)
		}
	}, [isGroupActive])

	useEffect(() => {
		setPage(activeStorePage)
	}, [activeStorePage])

	const safePage = Math.min(page, totalPages - 1)

	const visibleStores = stores.slice(
		safePage * STORES_PER_PAGE,
		safePage * STORES_PER_PAGE + STORES_PER_PAGE,
	)

	if (state === 'collapsed' && !isMobile) {
		return (
			<SidebarMenuItem>
				<SidebarFlyout
					label={entry.label}
					icon={entry.icon}
					isActive={isGroupActive}
				>
					<SidebarFlyoutLink
						href={entry.href}
						label='Vista general'
						icon={IcGrid1}
						isActive={pathname === entry.href}
					/>
					{stores.map((store) => (
						<SidebarFlyoutLink
							key={store.id}
							href={buildComplaintsStorePath(store.id)}
							label={store.name}
							icon={IcShop}
							isActive={store.id === activeStoreId}
						/>
					))}
				</SidebarFlyout>
			</SidebarMenuItem>
		)
	}

	return (
		<SidebarMenuItem>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<CollapsibleTrigger
					render={
						<SidebarMenuButton
							tooltip={entry.label}
							data-current={isGroupActive}
							className={sidebarNavGroupClassName}
						>
							<SidebarNavIcon
								icon={entry.icon}
								isActive={isGroupActive}
							/>
							<span>{entry.label}</span>
							<IcArrowRight02
								className={cn(
									'ml-auto size-3.5 opacity-50 transition-transform duration-150',
									isOpen && 'rotate-90',
								)}
							/>
						</SidebarMenuButton>
					}
				/>
				<CollapsibleContent>
					<SidebarMenuSub>
						<SidebarMenuSubItem>
							<SidebarMenuSubButton
								render={<Link to={entry.href} />}
								isActive={pathname === entry.href}
								aria-current={
									pathname === entry.href ? 'page' : undefined
								}
								className={sidebarNavSubItemClassName}
							>
								<IcGrid1
									type={
										pathname === entry.href
											? 'solid'
											: 'outline'
									}
								/>
								<span>Vista general</span>
							</SidebarMenuSubButton>
						</SidebarMenuSubItem>
						{visibleStores.map((store) => (
							<SidebarMenuSubItem key={store.id}>
								<SidebarMenuSubButton
									render={
										<Link
											to={buildComplaintsStorePath(
												store.id,
											)}
										/>
									}
									isActive={store.id === activeStoreId}
									aria-current={
										store.id === activeStoreId
											? 'page'
											: undefined
									}
									className={sidebarNavSubItemClassName}
								>
									<IcShop
										type={
											store.id === activeStoreId
												? 'solid'
												: 'outline'
										}
									/>
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
											<IcArrowLeft02 />
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
											<IcArrowRight02 />
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
