'use client'

import { Laptop, Moon, Sun, SunMoon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type ThemeOption = 'light' | 'dark' | 'system'

const THEME_OPTIONS: Array<{
	value: ThemeOption
	label: string
	icon: typeof Sun
}> = [
	{ value: 'light', label: 'Claro', icon: Sun },
	{ value: 'dark', label: 'Oscuro', icon: Moon },
	{ value: 'system', label: 'Sistema', icon: Laptop },
]

export function ThemeToggle() {
	const { setTheme, theme } = useTheme()

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={<Button variant='outline' size='icon' />}
				aria-label='Cambiar tema'
			>
				<SunMoon />
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
