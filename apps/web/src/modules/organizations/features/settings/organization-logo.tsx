import { useState } from 'react'
import { LogoIcon } from '@/shared/components/logo'
import { cn } from '@/shared/lib/utils'

export function OrganizationLogo({
	slug,
	logoKey,
	name,
	cacheKey,
	className,
}: {
	slug: string
	logoKey: string | null
	name: string
	cacheKey?: number
	className?: string
}) {
	const [failedSrc, setFailedSrc] = useState<string | null>(null)
	const src = `/api/logos/${encodeURIComponent(slug)}?v=${cacheKey ?? 0}`

	return (
		<div
			className={cn(
				'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground',
				className,
			)}
		>
			{logoKey && failedSrc !== src ? (
				<img
					src={src}
					alt={`Logo de ${name}`}
					className='size-full object-cover'
					onError={() => setFailedSrc(src)}
				/>
			) : (
				<LogoIcon className='size-5' />
			)}
		</div>
	)
}
