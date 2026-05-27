'use client'

import { ChevronsUpDown, Plus } from 'lucide-react'
import Link from 'next/link'
import { OrganizationLogo } from '@/components/organization-logo'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSidebar } from '@/components/ui/sidebar'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import type { UserOrganizationOption } from '@/modules/rbac/queries'

interface SidebarOrganizationSwitcherProps {
	organizations: UserOrganizationOption[]
	activeOrganization: UserOrganizationOption | null
	isPending: boolean
	onOrganizationChange: (organizationId: string) => void
}

export function SidebarOrganizationSwitcher({
	organizations,
	activeOrganization,
	isPending,
	onOrganizationChange,
}: SidebarOrganizationSwitcherProps) {
	const { state } = useSidebar()
	const isCollapsed = state === 'collapsed'

	const dropdownContent = (
		<DropdownMenuContent align='start' side='bottom' className='w-80 p-0'>
			<DropdownMenuGroup className='p-2'>
				<DropdownMenuLabel>Organizaciones</DropdownMenuLabel>
				<DropdownMenuRadioGroup
					value={activeOrganization?.id ?? ''}
					onValueChange={onOrganizationChange}
				>
					{organizations.map((organization) => (
						<DropdownMenuRadioItem
							key={organization.id}
							value={organization.id}
							disabled={isPending}
							className='px-2 py-2'
						>
							<OrganizationLogo
								organizationId={organization.id}
								logoKey={organization.logoKey}
								name={organization.name}
								cacheKey={
									organization.logoVersion ??
									organization.logoKey ??
									undefined
								}
								className='size-9'
							/>
							<span className='truncate'>
								{organization.name}
							</span>
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuGroup>
			<DropdownMenuSeparator />
			<div className='p-2'>
				<DropdownMenuItem
					render={<Link href='/dashboard/organizations/new' />}
					className='px-2 py-2 text-sm font-medium'
				>
					<div className='flex size-9 items-center justify-center rounded-lg border'>
						<Plus className='size-4' />
					</div>
					Agregar organización
				</DropdownMenuItem>
			</div>
		</DropdownMenuContent>
	)

	if (isCollapsed) {
		return (
			<DropdownMenu>
				<Tooltip>
					<TooltipTrigger
						render={
							<DropdownMenuTrigger
								render={
									<button
										type='button'
										className='flex w-full items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-sidebar-accent'
									>
										{activeOrganization ? (
											<OrganizationLogo
												organizationId={
													activeOrganization.id
												}
												logoKey={
													activeOrganization.logoKey
												}
												name={activeOrganization.name}
												cacheKey={
													activeOrganization.logoVersion ??
													activeOrganization.logoKey ??
													undefined
												}
												className='size-8'
											/>
										) : (
											<div className='flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground' />
										)}
									</button>
								}
							/>
						}
					/>
					<TooltipContent side='right' align='center'>
						{activeOrganization?.name ?? 'Open Reclamos'}
					</TooltipContent>
				</Tooltip>
				{dropdownContent}
			</DropdownMenu>
		)
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<button
						type='button'
						className='flex w-full items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-left transition-colors hover:bg-sidebar-accent'
					>
						{activeOrganization ? (
							<OrganizationLogo
								organizationId={activeOrganization.id}
								logoKey={activeOrganization.logoKey}
								name={activeOrganization.name}
								cacheKey={
									activeOrganization.logoVersion ??
									activeOrganization.logoKey ??
									undefined
								}
								className='size-10'
							/>
						) : (
							<div className='flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground' />
						)}
						<div className='min-w-0 flex-1'>
							<p className='truncate text-sm font-semibold'>
								{activeOrganization?.name ?? 'Open Reclamos'}
							</p>
							<p className='truncate text-xs text-muted-foreground'>
								Cambiar organización
							</p>
						</div>
						<ChevronsUpDown className='size-4 shrink-0 text-muted-foreground' />
					</button>
				}
			/>
			{dropdownContent}
		</DropdownMenu>
	)
}
