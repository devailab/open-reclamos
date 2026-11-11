import { IcClipboardClose } from '@/shared/components/icons/ic-clipboard-close'

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/shared/components/ui/card'

interface FormUnavailableCardProps {
	title?: string
	description: string
}

export function FormUnavailableCard({
	title = 'Formulario no disponible',
	description,
}: FormUnavailableCardProps) {
	return (
		<Card>
			<CardHeader className='pb-3'>
				<CardTitle className='flex items-center gap-2 text-base'>
					<IcClipboardClose className='size-4' />
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p className='text-sm text-muted-foreground'>{description}</p>
			</CardContent>
		</Card>
	)
}
