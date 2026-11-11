'use client'

import { useTheme } from '@wrksz/themes/client'
import { IcMonitor } from '@/shared/components/icons/ic-monitor'
import { IcMoon } from '@/shared/components/icons/ic-moon'
import { IcSun } from '@/shared/components/icons/ic-sun'
import { Button } from '@/shared/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import type { IconComponent } from '@/shared/lib/render-icon'

type ThemeOption = 'light' | 'dark' | 'system'

const THEME_OPTIONS: Array<{
	value: ThemeOption
	label: string
	icon: IconComponent
}> = [
	{ value: 'light', label: 'Claro', icon: IcSun },
	{ value: 'dark', label: 'Oscuro', icon: IcMoon },
	{ value: 'system', label: 'Sistema', icon: IcMonitor },
]

export function ThemeToggle() {
	const { setTheme, theme } = useTheme()

	const ThemeIcon =
		theme === 'dark' ? IcMoon : theme === 'light' ? IcSun : IcMonitor

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={<Button variant='outline' size='icon' />}
				aria-label='Cambiar tema'
			>
				<ThemeIcon />
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end' className='w-40'>
				<DropdownMenuGroup>
					<DropdownMenuLabel>Tema</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuRadioGroup
						value={theme ?? 'system'}
						onValueChange={(value) =>
							setTheme(value as ThemeOption)
						}
					>
						{THEME_OPTIONS.map((option) => (
							<DropdownMenuRadioItem
								key={option.value}
								value={option.value}
							>
								<option.icon />
								{option.label}
							</DropdownMenuRadioItem>
						))}
					</DropdownMenuRadioGroup>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
