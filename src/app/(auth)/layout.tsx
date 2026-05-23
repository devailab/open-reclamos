import type { FC, PropsWithChildren } from 'react'
import { ThemeToggle } from '@/components/theme/theme-toggle'

const AuthLayout: FC<PropsWithChildren> = ({ children }) => {
	return (
		<div className='relative min-h-svh flex items-center justify-center bg-muted/40 p-4'>
			<div className='absolute top-4 right-4'>
				<ThemeToggle />
			</div>
			<div className='w-full max-w-sm'>{children}</div>
		</div>
	)
}

export default AuthLayout
