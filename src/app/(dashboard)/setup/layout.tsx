import type { FC, PropsWithChildren } from 'react'

const SetupLayout: FC<PropsWithChildren> = ({ children }) => {
	return (
		<div className='min-h-svh bg-muted/40 flex flex-col items-center justify-start p-4 pt-12 pb-16'>
			<div className='w-full max-w-2xl'>{children}</div>
		</div>
	)
}

export default SetupLayout
