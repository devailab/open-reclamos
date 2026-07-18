'use client'

import { useTheme } from '@wrksz/themes/client'
import { Toaster } from 'sileo'

type ToasterTheme = 'light' | 'dark' | 'system'

const TOASTER_THEMES: ToasterTheme[] = ['light', 'dark', 'system']

function isToasterTheme(value: string | undefined): value is ToasterTheme {
	return value !== undefined && TOASTER_THEMES.includes(value as ToasterTheme)
}

export function ThemeToaster() {
	const { resolvedTheme } = useTheme()
	const toasterTheme = isToasterTheme(resolvedTheme)
		? resolvedTheme
		: 'system'

	return <Toaster position='top-center' theme={toasterTheme} />
}
