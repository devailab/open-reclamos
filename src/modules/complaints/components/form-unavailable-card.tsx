'use client'

import { FileX2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
					<FileX2 className='size-4' />
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p className='text-sm text-muted-foreground'>{description}</p>
			</CardContent>
		</Card>
	)
}
