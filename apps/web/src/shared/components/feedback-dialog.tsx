'use client'

import { AnimatePresence, motion } from 'motion/react'
import { IcCloseCircle } from '@/shared/components/icons/ic-close-circle'
import { IcInfoCircle } from '@/shared/components/icons/ic-info-circle'
import { IcTickCircle } from '@/shared/components/icons/ic-tick-circle'
import { Button } from '@/shared/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/shared/components/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { useFeedbackDialogStore } from '@/shared/stores/feedback-dialog-store'

const ALERT_ICON_BY_VARIANT = {
	success: IcTickCircle,
	info: IcInfoCircle,
	warning: IcInfoCircle,
	error: IcCloseCircle,
} as const

const ALERT_ICON_CLASS_BY_VARIANT = {
	success: 'text-emerald-600',
	info: 'text-sky-600',
	warning: 'text-amber-600',
	error: 'text-red-600',
} as const

export default function FeedbackDialog() {
	const dialog = useFeedbackDialogStore((state) => state.dialog)

	const resolveConfirm = useFeedbackDialogStore(
		(state) => state.resolveConfirm,
	)

	const resolveAlert = useFeedbackDialogStore((state) => state.resolveAlert)

	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen || !dialog) {
			return
		}

		if (dialog.type === 'confirm') {
			resolveConfirm(false)

			return
		}

		resolveAlert()
	}

	return (
		<Dialog open={Boolean(dialog)} onOpenChange={handleOpenChange}>
			<DialogContent showCloseButton={false} className='sm:max-w-md'>
				<AnimatePresence mode='wait' initial={false}>
					{dialog?.type === 'confirm' && (
						<motion.div
							key='confirm'
							initial={{ opacity: 0, y: 6 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -6 }}
							transition={{ duration: 0.18, ease: 'easeOut' }}
						>
							<DialogHeader>
								<DialogTitle>
									{dialog.options.title}
								</DialogTitle>
								{dialog.options.description && (
									<DialogDescription>
										{dialog.options.description}
									</DialogDescription>
								)}
							</DialogHeader>
							<DialogFooter className='mt-4'>
								<Button
									type='button'
									variant='outline'
									onClick={() => resolveConfirm(false)}
								>
									{dialog.options.cancelText}
								</Button>
								<Button
									type='button'
									variant={
										dialog.options.variant === 'destructive'
											? 'destructive'
											: 'default'
									}
									onClick={() => resolveConfirm(true)}
								>
									{dialog.options.confirmText}
								</Button>
							</DialogFooter>
						</motion.div>
					)}

					{dialog?.type === 'alert' && (
						<motion.div
							key='alert'
							initial={{ opacity: 0, y: 6 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -6 }}
							transition={{ duration: 0.18, ease: 'easeOut' }}
						>
							<DialogHeader className='gap-3'>
								<div className='flex items-center gap-2'>
									{(() => {
										const Icon =
											ALERT_ICON_BY_VARIANT[
												dialog.options.variant
											]

										return (
											<motion.div
												initial={{
													scale: 0.5,
													opacity: 0,
												}}
												animate={{
													scale: 1,
													opacity: 1,
												}}
												transition={{
													delay: 0.08,
													duration: 0.2,
													type: 'spring',
													stiffness: 300,
													damping: 20,
												}}
											>
												<Icon
													className={cn(
														'h-5 w-5',
														ALERT_ICON_CLASS_BY_VARIANT[
															dialog.options
																.variant
														],
													)}
												/>
											</motion.div>
										)
									})()}
									<DialogTitle>
										{dialog.options.title}
									</DialogTitle>
								</div>
								{dialog.options.description && (
									<DialogDescription>
										{dialog.options.description}
									</DialogDescription>
								)}
							</DialogHeader>
							<DialogFooter className='mt-4'>
								<Button
									type='button'
									onClick={() => resolveAlert()}
								>
									{dialog.options.confirmText}
								</Button>
							</DialogFooter>
						</motion.div>
					)}
				</AnimatePresence>
			</DialogContent>
		</Dialog>
	)
}
