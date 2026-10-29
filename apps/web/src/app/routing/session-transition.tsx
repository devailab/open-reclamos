import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { PropsWithChildren } from 'react'
import { FullPageLoading } from './route-feedback'

interface SessionTransitionProps extends PropsWithChildren {
	loading: boolean
}

export function SessionTransition({
	loading,
	children,
}: SessionTransitionProps) {
	const reducedMotion = useReducedMotion()
	const duration = reducedMotion ? 0 : 0.2

	return (
		<div className='min-h-svh' aria-busy={loading}>
			<motion.div
				initial={false}
				animate={{ opacity: loading ? 0 : 1 }}
				transition={{ duration, ease: 'easeOut' }}
				inert={loading}
				style={{ visibility: loading ? 'hidden' : 'visible' }}
			>
				{children}
			</motion.div>
			<AnimatePresence initial={false}>
				{loading ? (
					<motion.div
						key='session-loading'
						className='fixed inset-0 z-50 overflow-y-auto bg-background'
						initial={{ opacity: 0 }}
						animate={{
							opacity: 1,
							transition: {
								duration,
								delay: reducedMotion ? 0 : 0.12,
							},
						}}
						exit={{ opacity: 0, transition: { duration } }}
					>
						<FullPageLoading />
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	)
}
