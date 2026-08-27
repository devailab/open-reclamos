import { Ban } from 'lucide-react'
import type { FC } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateDisplay } from '@/lib/formatters'

interface OrganizationSuspendedScreenProps {
	organizationName: string
	suspendedAt: Date | null
	suspensionReason: string | null
}

export const OrganizationSuspendedScreen: FC<
	OrganizationSuspendedScreenProps
> = ({ organizationName, suspendedAt, suspensionReason }) => {
	return (
		<div className='flex min-h-svh items-center justify-center p-6'>
			<Card className='w-full max-w-md'>
				<CardContent className='space-y-4 pt-6 text-center'>
					<div className='mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10'>
						<Ban className='size-6 text-destructive' />
					</div>

					<div className='space-y-1'>
						<h1 className='text-lg font-semibold'>
							Organización suspendida
						</h1>
						<p className='text-sm text-muted-foreground'>
							El acceso de {organizationName} al servicio está
							suspendido temporalmente.
						</p>
					</div>

					{suspensionReason && (
						<div className='rounded-lg border bg-muted/40 px-4 py-3 text-left'>
							<p className='text-xs font-medium text-muted-foreground'>
								Motivo
							</p>
							<p className='mt-1 text-sm'>{suspensionReason}</p>
							{suspendedAt && (
								<p className='mt-2 text-xs text-muted-foreground'>
									Desde el {formatDateDisplay(suspendedAt)}
								</p>
							)}
						</div>
					)}

					<p className='text-xs text-muted-foreground'>
						Contacta al administrador de la plataforma para
						regularizar la situación.
					</p>
				</CardContent>
			</Card>
		</div>
	)
}
