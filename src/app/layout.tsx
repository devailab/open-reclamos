import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'
import type { FC, PropsWithChildren } from 'react'
import { Toaster } from 'sileo'
import FeedbackDialog from '@/components/feedback-dialog'
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
		<html lang='es'>
			<body className={`${poppins.variable} antialiased`}>
				<TooltipProvider>{children}</TooltipProvider>
				<FeedbackDialog />
				<Toaster position='top-center' theme='light' />
			</body>
		</html>
	)
}

export default RootLayout
