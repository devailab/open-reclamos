import type { ReactNode } from 'react'
import { Link } from 'react-router'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { SidebarMenuButton } from '@/shared/components/ui/sidebar'
import type { IconComponent } from '@/shared/lib/render-icon'
import { SidebarNavIcon } from './sidebar-nav-icon'
import { sidebarNavGroupClassName } from './sidebar-nav-styles'

export function SidebarFlyout({
	label,
	icon,
	isActive,
	children,
}: {
	label: string
	icon: IconComponent
	isActive: boolean
	children: ReactNode
}) {
	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger
				openOnHover
				delay={150}
				closeDelay={200}
				render={
					<SidebarMenuButton
						aria-label={label}
						data-current={isActive}
						className={sidebarNavGroupClassName}
					/>
				}
			>
				<SidebarNavIcon icon={icon} isActive={isActive} />
			</DropdownMenuTrigger>
			<DropdownMenuContent
				side='right'
				align='start'
				sideOffset={20}
				aria-label={label}
				className='max-h-[min(24rem,var(--available-height))] w-64 rounded-xl p-1.5 shadow-lg'
			>
				<DropdownMenuGroup className='space-y-1'>
					<DropdownMenuLabel className='px-2 py-1.5'>
						{label}
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{children}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

export function SidebarFlyoutLink({
	href,
	label,
	icon,
	isActive,
	iconSupportsSolid,
}: {
	href: string
	label: string
	icon: IconComponent
	isActive: boolean
	iconSupportsSolid?: boolean
}) {
	return (
		<DropdownMenuItem
			render={<Link to={href} />}
			aria-current={isActive ? 'page' : undefined}
			data-active={isActive || undefined}
			className='min-h-9 gap-2 rounded-lg px-2 font-normal text-muted-foreground transition-colors duration-150 focus:bg-foreground/5 data-active:bg-foreground/8 data-active:text-foreground data-active:inset-ring data-active:inset-ring-foreground/8 data-active:focus:bg-foreground/8 dark:data-active:bg-foreground/12 dark:data-active:focus:bg-foreground/12 [&>svg]:text-current'
		>
			<SidebarNavIcon
				icon={icon}
				isActive={isActive}
				supportsSolid={iconSupportsSolid}
			/>
			<span className='truncate'>{label}</span>
		</DropdownMenuItem>
	)
}
