import type { SlugKind } from '@/shared/hooks/use-public-slug'
import TextField from './text-field'

export function PublicSlugField({
	slug,
	onChange,
	kind,
	error,
	status,
	disabled,
	originalSlug,
}: {
	slug: string
	onChange: (value: string | null) => void
	kind: SlugKind
	error: string | null
	status: 'checking' | 'available' | 'error'
	disabled?: boolean
	originalSlug?: string
}) {
	const path = `/${kind === 'store' ? 's' : 'c'}/${slug}`
	const url =
		typeof window === 'undefined'
			? path
			: `${window.location.origin}${path}`

	return (
		<div className='space-y-2'>
			<TextField
				label='Identificador de la URL (slug)'
				placeholder={
					kind === 'store' ? 'tienda-principal' : 'mi-empresa'
				}
				value={slug}
				onValueChange={onChange}
				autoComplete='off'
				disabled={disabled}
			/>
			<p className='text-xs text-muted-foreground'>
				Se usa en el enlace de tu formulario de reclamos. Puedes aceptar
				la sugerencia o editarla.
			</p>
			<p className='text-xs text-muted-foreground'>Así será tu URL:</p>
			<p className='break-all rounded-md bg-muted/50 px-3 py-2 font-mono text-xs'>
				{url}
			</p>
			<p
				role='status'
				className={
					status === 'error'
						? 'text-xs text-destructive'
						: 'text-xs text-muted-foreground'
				}
			>
				{!slug
					? 'Escribe el nombre o elige un identificador para tu enlace.'
					: status === 'checking'
						? 'Comprobando disponibilidad...'
						: (error ?? 'Identificador disponible.')}
			</p>
			{originalSlug && originalSlug !== slug && (
				<p
					role='alert'
					className='rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm'
				>
					Al cambiar este identificador, la URL anterior dejará de
					funcionar. Actualiza los enlaces compartidos y los QR
					generados anteriormente.
				</p>
			)}
		</div>
	)
}
