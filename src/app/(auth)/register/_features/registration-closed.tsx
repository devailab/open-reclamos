import Link from 'next/link'
import type { FC } from 'react'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'

export const RegistrationClosed: FC = () => {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Registro no disponible</CardTitle>
				<CardDescription>
					El registro de nuevas cuentas está deshabilitado. Contacta
					al administrador para obtener acceso.
				</CardDescription>
			</CardHeader>
			<CardFooter>
				<Button variant='outline' className='w-full'>
					<Link href='/login'>Ir al inicio de sesión</Link>
				</Button>
			</CardFooter>
		</Card>
	)
}
