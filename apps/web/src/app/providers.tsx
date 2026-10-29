import { ClientThemeProvider } from '@wrksz/themes/client'
import type { PropsWithChildren } from 'react'
import { TooltipProvider } from '@/shared/components/ui/tooltip'

export function AppProviders({ children }: PropsWithChildren) {
	return (
		<ClientThemeProvider
			storage='localStorage'
			storageKey='theme'
			attribute='class'
			defaultTheme='system'
			enableSystem
			disableTransitionOnChange
		>
			<TooltipProvider>{children}</TooltipProvider>
		</ClientThemeProvider>
	)
}
