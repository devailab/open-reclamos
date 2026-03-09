import type { FC, PropsWithChildren } from 'react'

const AuthLayout: FC<PropsWithChildren> = ({ children }) => {
	return (
		<div className='min-h-svh flex items-center justify-center bg-muted/40 p-4'>
			<div className='w-full max-w-sm'>{children}</div>
		</div>
	)
}

export default AuthLayout
