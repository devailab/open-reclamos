'use client'

import { useState } from 'react'
import { IcCopy } from '@/shared/components/icons/ic-copy'
import { IcTickCircle } from '@/shared/components/icons/ic-tick-circle'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

interface CopyButtonProps {
	value: string
	className?: string
	size?: 'icon-sm' | 'icon-xs' | 'icon' | 'icon-lg'
}

export function CopyButton({
	value,
	className,
	size = 'icon-sm',
}: CopyButtonProps) {
	const [copied, setCopied] = useState(false)

	const handleCopy = () => {
		navigator.clipboard.writeText(value).then(() => {
			setCopied(true)
			setTimeout(() => setCopied(false), 1500)
		})
	}

	return (
		<Button
			type='button'
			variant='ghost'
			size={size}
			title={copied ? 'Copiado' : 'Copiar enlace'}
			className={cn(className)}
			onClick={(event) => {
				event.stopPropagation()
				handleCopy()
			}}
		>
			{copied ? <IcTickCircle className='text-green-500' /> : <IcCopy />}
			<span className='sr-only'>
				{copied ? 'Copiado' : 'Copiar enlace'}
			</span>
		</Button>
	)
}
