import { cn } from '@/lib/utils'

interface LogoIconProps {
	className?: string
}

export function LogoIcon({ className }: LogoIconProps) {
	return (
		<svg
			viewBox='0 0 911 949'
			fill='currentColor'
			aria-hidden='true'
			className={cn('size-full', className)}
			style={{ fillRule: 'evenodd', clipRule: 'evenodd' }}
		>
			<g transform='translate(-629.695 -396.125)'>
				<path d='M1429.3 396.125c-139.509.85-257.148 43.06-344.3 141.875l-.002 99c60.514-84.157 173.081-154.377 288.302-153.875v87c31.692-6.768 61.836-9.623 91-10l-1 369c.464 66.577-34.798 122.791-108 168L1085 1255.003l-.002 90.01 303.302-177.888c97.904-60.298 151.123-140.07 152-234V508.236c.09-17.81-9.418-23.029-22.839-23.11h-88.16zm-688.604 0c139.509.85 257.148 43.06 344.3 141.875l.002 99c-60.514-84.157-173.081-154.377-288.302-153.875v87c-31.692-6.768-61.836-9.623-91-10l1 369c-.464 66.577 34.798 122.791 108 168l270.3 157.878.002 90.01-303.302-177.888c-97.904-60.298-151.123-140.07-152-234V508.236c-.09-17.81 9.418-23.029 22.839-23.11h88.16z' />
				<path d='M944.067 822.8 1085.2 963.933c8.316 8.316 8.316 21.818 0 30.134l-30.133 30.133c-8.316 8.316-21.818 8.316-30.134 0L883.8 883.067c-8.316-8.316-8.316-21.818 0-30.134l30.133-30.133c8.316-8.316 21.818-8.316 30.134 0' />
				<path d='M1249.933 708.8 994.8 963.932c-8.317 8.317-8.316 21.82 0 30.134l30.133 30.134c8.315 8.315 21.817 8.316 30.134-.001L1310.2 769.067c8.317-8.317 8.316-21.819 0-30.134l-30.133-30.134c-8.315-8.315-21.817-8.316-30.134.001' />
			</g>
		</svg>
	)
}

interface LogoProps {
	className?: string
	showText?: boolean
}

export function Logo({ className, showText = true }: LogoProps) {
	return (
		<div className={cn('flex items-center gap-2', className)}>
			<div className='flex size-7 shrink-0 items-center justify-center rounded-md bg-primary p-1 text-primary-foreground'>
				<LogoIcon />
			</div>
			{showText && (
				<span className='truncate text-sm font-semibold'>
					Open Reclamos
				</span>
			)}
		</div>
	)
}
