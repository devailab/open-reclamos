'use client'

import { ExternalLink } from 'lucide-react'
import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'

interface PublicFormLinkProps {
	/** Ruta relativa del formulario, ej. "/s/mi-tienda" */
	path: string
}

export function PublicFormLink({ path }: PublicFormLinkProps) {
	const fullUrl =
		typeof window !== 'undefined'
			? `${window.location.origin}${path}`
			: path

	return (
		<div className='flex items-center gap-1 rounded-md border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground'>
			<span className='min-w-0 flex-1 truncate font-mono text-xs'>
				{path}
			</span>
			<CopyButton value={fullUrl} size='icon-xs' />
			<Button
				type='button'
				variant='ghost'
				size='icon-xs'
				title='Abrir enlace'
				onClick={() =>
					window.open(fullUrl, '_blank', 'noopener,noreferrer')
				}
			>
				<ExternalLink />
				<span className='sr-only'>Abrir enlace</span>
			</Button>
		</div>
	)
}
