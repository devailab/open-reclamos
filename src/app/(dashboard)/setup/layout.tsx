import type { FC, PropsWithChildren } from 'react'
import { ThemeToggle } from '@/components/theme/theme-toggle'

const SetupLayout: FC<PropsWithChildren> = ({ children }) => {
	return (
		<div className='relative min-h-svh bg-muted/40 flex flex-col items-center justify-start p-4 pt-12 pb-16'>
			<div className='absolute top-4 right-4'>
				<ThemeToggle />
			</div>
			<div className='w-full max-w-2xl'>{children}</div>
		</div>
	)
}

export default SetupLayout
