'use client'

import { useState } from 'react'
import { LogoIcon } from '@/shared/components/logo'
import { cn } from '@/shared/lib/utils'

interface OrganizationLogoProps {
	slug: string
	logoKey: string | null
	name: string
	className?: string
	cacheKey?: string | number
}

export function OrganizationLogo({
	slug,
	logoKey,
	name,
	className,
	cacheKey,
}: OrganizationLogoProps) {
	const [failedSrc, setFailedSrc] = useState<string | null>(null)

	const src = `/api/logos/${encodeURIComponent(slug)}${
		cacheKey ? `?v=${encodeURIComponent(String(cacheKey))}` : ''
	}`

	const showUploadedLogo = Boolean(logoKey) && failedSrc !== src

	return (
		<div
			className={cn(
				'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground',
				className,
			)}
		>
			{showUploadedLogo ? (
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
