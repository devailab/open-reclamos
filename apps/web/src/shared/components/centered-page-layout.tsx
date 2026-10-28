import type { PropsWithChildren } from 'react'
import { ThemeToggle } from '@/shared/components/theme/theme-toggle'
import { cn } from '@/shared/lib/utils'

export function CenteredPageLayout({
	children,
	size = 'compact',
}: PropsWithChildren<{ size?: 'compact' | 'wide' }>) {
	return (
		<main
			data-slot='centered-page-layout'
			className='relative flex min-h-svh w-full items-center justify-center bg-muted/40 px-4 py-16 sm:px-6 lg:px-8'
		>
			<div className='absolute right-4 top-4 sm:right-6 sm:top-6'>
				<ThemeToggle />
			</div>
			<div
				data-slot='centered-page-content'
				className={cn(
					'mx-auto w-full min-w-0',
					size === 'wide' ? 'max-w-3xl' : 'max-w-md',
				)}
			>
				{children}
			</div>
		</main>
	)
}
