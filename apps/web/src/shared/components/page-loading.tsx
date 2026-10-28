import { LogoIcon } from '@/shared/components/logo'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { cn } from '@/shared/lib/utils'

export function PageLoading({ className }: { className?: string }) {
	return (
		<div
			role='status'
			aria-live='polite'
			className={cn(
				'flex min-h-64 w-full items-center justify-center px-6 py-12',
				className,
			)}
		>
			<span className='sr-only'>Cargando...</span>
			<div
				aria-hidden='true'
				className='flex w-full max-w-xs flex-col items-center text-center'
			>
				<div className='relative mb-6 flex size-20 items-center justify-center rounded-full bg-muted/50'>
					<div className='absolute inset-0 rounded-full border-2 border-border/60 border-t-primary motion-safe:animate-spin' />
					<div className='flex size-12 items-center justify-center rounded-xl border bg-background text-foreground shadow-sm'>
						<LogoIcon className='size-6' />
					</div>
				</div>
				<p className='text-base font-medium tracking-tight'>
					Un momento…
				</p>
				<p className='mt-1.5 text-sm leading-relaxed text-muted-foreground'>
					Estamos preparando la información para ti.
				</p>
				<div className='mt-6 flex w-36 flex-col items-center gap-2'>
					<Skeleton className='h-1.5 w-full rounded-full motion-reduce:animate-none' />
					<Skeleton className='h-1.5 w-20 rounded-full motion-reduce:animate-none' />
				</div>
			</div>
		</div>
	)
}
