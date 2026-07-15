import { ExternalLink } from 'lucide-react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'

interface SsoAccountCardProps {
	providerName: string
	accountUrl: string | null
}

export function SsoAccountCard({
	providerName,
	accountUrl,
}: SsoAccountCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className='text-base'>
					Cuenta administrada por {providerName}
				</CardTitle>
				<CardDescription>
					Tu perfil, contraseña y métodos de acceso se administran en
					el proveedor de identidad de tu organización.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{accountUrl ? (
					<a
						href={accountUrl}
						target='_blank'
						rel='noopener noreferrer'
						className='inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted'
					>
						Administrar mi cuenta
						<ExternalLink className='size-3.5 opacity-60' />
					</a>
				) : (
					<p className='text-sm text-muted-foreground'>
						Contacta al administrador de tu organización para
						cambios en tu cuenta.
					</p>
				)}
			</CardContent>
		</Card>
	)
}
