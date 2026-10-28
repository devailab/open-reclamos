'use client'

import type {
	AlertDialogOptions,
	ConfirmDialogOptions,
} from '@/shared/stores/feedback-dialog-store'
import { useFeedbackDialogStore } from '@/shared/stores/feedback-dialog-store'

export const feedback = {
	confirm: (options: ConfirmDialogOptions) => {
		return useFeedbackDialogStore.getState().openConfirm(options)
	},
	alert: {
		success: (options: Omit<AlertDialogOptions, 'variant'>) => {
			return useFeedbackDialogStore
				.getState()
				.openAlert({ ...options, variant: 'success' })
		},
		info: (options: Omit<AlertDialogOptions, 'variant'>) => {
			return useFeedbackDialogStore
				.getState()
				.openAlert({ ...options, variant: 'info' })
		},
		warning: (options: Omit<AlertDialogOptions, 'variant'>) => {
			return useFeedbackDialogStore
				.getState()
				.openAlert({ ...options, variant: 'warning' })
		},
		error: (options: Omit<AlertDialogOptions, 'variant'>) => {
			return useFeedbackDialogStore
				.getState()
				.openAlert({ ...options, variant: 'error' })
		},
	},
}
