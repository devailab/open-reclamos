import type { FC } from 'react'

const AccountPage: FC = () => {
	return (
		<div className='space-y-6'>
			<div>
				<h1 className='text-2xl font-semibold'>Mi cuenta</h1>
				<p className='mt-1 text-sm text-muted-foreground'>
					Administra tu perfil y preferencias de cuenta.
				</p>
			</div>
		</div>
	)
}

export default AccountPage
