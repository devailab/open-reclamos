'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
			onClick={handleCopy}
		>
			{copied ? <Check className='text-green-500' /> : <Copy />}
			<span className='sr-only'>
				{copied ? 'Copiado' : 'Copiar enlace'}
			</span>
		</Button>
	)
}
