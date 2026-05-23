import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'
import type { FC, PropsWithChildren } from 'react'
import FeedbackDialog from '@/components/feedback-dialog'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ThemeToaster } from '@/components/theme/theme-toaster'
import { TooltipProvider } from '@/components/ui/tooltip'

const poppins = Poppins({
	variable: '--font-poppins',
	subsets: ['latin'],
	weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
	title: 'Open Reclamos',
	description: 'Libro de reclamaciones',
}

const RootLayout: FC<PropsWithChildren> = ({ children }) => {
	return (
		<html lang='es' suppressHydrationWarning>
			<body className={`${poppins.variable} antialiased`}>
				<ThemeProvider
					attribute='class'
					defaultTheme='system'
					enableSystem
					disableTransitionOnChange
				>
					<TooltipProvider>{children}</TooltipProvider>
					<FeedbackDialog />
					<ThemeToaster />
				</ThemeProvider>
			</body>
		</html>
	)
}

export default RootLayout
