import { ClientThemeProvider } from '@wrksz/themes/client'
import type { PropsWithChildren } from 'react'
import { SessionProvider } from '@/shared/auth/session'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import { PublicConfigProvider } from '@/shared/config/public-config'

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
			<PublicConfigProvider>
				<SessionProvider>
					<TooltipProvider>{children}</TooltipProvider>
				</SessionProvider>
			</PublicConfigProvider>
		</ClientThemeProvider>
	)
}
