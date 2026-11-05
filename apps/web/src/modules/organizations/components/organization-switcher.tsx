'use client'

import { ChevronsUpDown, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { OrganizationLogo } from '@/modules/organizations/components/organization-logo'
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
} from '@/shared/components/ui/dropdown-menu'
import { useSidebar } from '@/shared/components/ui/sidebar'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/shared/components/ui/tooltip'
import { usePublicConfig } from '@/shared/config/public-config'
import type { UserOrganizationOption } from '../types'

interface SidebarOrganizationSwitcherProps {
	organizations: UserOrganizationOption[]
	activeOrganization: UserOrganizationOption | null
	isPending: boolean
	allowActiveOrganizationRetry?: boolean
	onOrganizationChange: (organizationId: string) => void
}

export function SidebarOrganizationSwitcher({
	organizations,
	activeOrganization,
	isPending,
	allowActiveOrganizationRetry = false,
	onOrganizationChange,
}: SidebarOrganizationSwitcherProps) {
	const { state } = useSidebar()
	const config = usePublicConfig()
	const isCollapsed = state === 'collapsed'

	const dropdownContent = (
		<DropdownMenuContent align='start' side='bottom' className='w-64 p-0'>
			<DropdownMenuGroup className='p-1'>
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
							onClick={() => {
								if (
									allowActiveOrganizationRetry &&
									organization.id === activeOrganization?.id
								) {
									onOrganizationChange(organization.id)
								}
							}}
							className='gap-2 px-2 py-2'
						>
							<OrganizationLogo
								slug={organization.slug}
								logoKey={organization.logoKey}
								name={organization.name}
								cacheKey={
									organization.logoVersion ??
									organization.logoKey ??
									undefined
								}
								className='size-6'
							/>
							<span className='truncate'>
								{organization.name}
							</span>
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuGroup>
			<DropdownMenuSeparator />
			<div className='p-1'>
				<DropdownMenuItem
					render={<Link to='/dashboard/organizations/new' />}
					className='gap-2 px-2 py-1 text-sm font-medium'
				>
					<div className='flex size-6 items-center justify-center rounded-md border'>
						<Plus className='size-3.5' />
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
												slug={activeOrganization.slug}
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
						{activeOrganization?.name ??
							config?.appName ??
							'Open Reclamos'}
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
						className='flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-sidebar-accent'
					>
						{activeOrganization ? (
							<OrganizationLogo
								slug={activeOrganization.slug}
								logoKey={activeOrganization.logoKey}
								name={activeOrganization.name}
								cacheKey={
									activeOrganization.logoVersion ??
									activeOrganization.logoKey ??
									undefined
								}
								className='size-6'
							/>
						) : (
							<div className='flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground' />
						)}
						<div className='min-w-0 flex-1'>
							<p className='truncate text-sm font-semibold'>
								{activeOrganization?.name ??
									config?.appName ??
									'Open Reclamos'}
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
