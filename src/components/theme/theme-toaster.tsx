'use client'

import { useTheme } from 'next-themes'
import { Toaster } from 'sileo'

type ToasterTheme = 'light' | 'dark' | 'system'

const TOASTER_THEMES: ToasterTheme[] = ['light', 'dark', 'system']

function isToasterTheme(value: string | undefined): value is ToasterTheme {
	return value !== undefined && TOASTER_THEMES.includes(value as ToasterTheme)
}

export function ThemeToaster() {
	const { theme } = useTheme()
	const toasterTheme = isToasterTheme(theme) ? theme : 'system'

	return <Toaster position='top-center' theme={toasterTheme} />
}
