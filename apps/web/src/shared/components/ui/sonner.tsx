'use client'

import { useTheme } from '@wrksz/themes/client'
import { Loader2Icon } from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { IcCloseCircle } from '@/shared/components/icons/ic-close-circle'
import { IcInfoCircle } from '@/shared/components/icons/ic-info-circle'
import { IcTickCircle } from '@/shared/components/icons/ic-tick-circle'
import { IcWarning2 } from '@/shared/components/icons/ic-warning-2'

const Toaster = ({ ...props }: ToasterProps) => {
	const { resolvedTheme = 'system' } = useTheme()

	return (
		<Sonner
			theme={resolvedTheme as ToasterProps['theme']}
			className='toaster group'
			icons={{
				success: <IcTickCircle className='size-4' />,
				info: <IcInfoCircle className='size-4' />,
				warning: <IcWarning2 className='size-4' />,
				error: <IcCloseCircle className='size-4' />,
				loading: <Loader2Icon className='size-4 animate-spin' />,
			}}
			style={
				{
					'--normal-bg': 'var(--popover)',
					'--normal-text': 'var(--popover-foreground)',
					'--normal-border': 'var(--border)',
					'--border-radius': 'var(--radius)',
				} as React.CSSProperties
			}
			toastOptions={{
				classNames: {
					toast: 'cn-toast',
				},
			}}
			{...props}
		/>
	)
}

export { Toaster }
