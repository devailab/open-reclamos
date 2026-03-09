'use client'

import { create } from 'zustand'

export interface ConfirmDialogOptions {
	title: string
	description?: string
	confirmText?: string
	cancelText?: string
	variant?: 'default' | 'destructive'
}

export interface AlertDialogOptions {
	title: string
	description?: string
	confirmText?: string
	variant?: 'success' | 'info' | 'warning' | 'error'
}

type DialogState =
	| {
			type: 'confirm'
			options: Required<ConfirmDialogOptions>
			resolve: (accepted: boolean) => void
	  }
	| {
			type: 'alert'
			options: Required<AlertDialogOptions>
			resolve: () => void
	  }

interface FeedbackDialogStore {
	dialog: DialogState | null
	openConfirm: (options: ConfirmDialogOptions) => Promise<boolean>
	openAlert: (options: AlertDialogOptions) => Promise<void>
	resolveConfirm: (accepted: boolean) => void
	resolveAlert: () => void
}

const DEFAULT_CONFIRM_OPTIONS: Required<ConfirmDialogOptions> = {
	title: 'Confirmar accion',
	description: '',
	confirmText: 'Confirmar',
	cancelText: 'Cancelar',
	variant: 'default',
}

const DEFAULT_ALERT_OPTIONS: Required<AlertDialogOptions> = {
	title: 'Operacion completada',
	description: '',
	confirmText: 'Aceptar',
	variant: 'info',
}

const safelyResolveCurrentDialog = (dialog: DialogState | null) => {
	if (!dialog) return
	if (dialog.type === 'confirm') {
		dialog.resolve(false)
		return
	}
	dialog.resolve()
}

export const useFeedbackDialogStore = create<FeedbackDialogStore>(
	(set, get) => ({
		dialog: null,
		openConfirm: async (options) => {
			safelyResolveCurrentDialog(get().dialog)

			return new Promise<boolean>((resolve) => {
				set({
					dialog: {
						type: 'confirm',
						options: {
							...DEFAULT_CONFIRM_OPTIONS,
							...options,
						},
						resolve,
					},
				})
			})
		},
		openAlert: async (options) => {
			safelyResolveCurrentDialog(get().dialog)

			return new Promise<void>((resolve) => {
				set({
					dialog: {
						type: 'alert',
						options: {
							...DEFAULT_ALERT_OPTIONS,
							...options,
						},
						resolve,
					},
				})
			})
		},
		resolveConfirm: (accepted) => {
			const currentDialog = get().dialog
			if (!currentDialog || currentDialog.type !== 'confirm') return

			currentDialog.resolve(accepted)
			set({ dialog: null })
		},
		resolveAlert: () => {
			const currentDialog = get().dialog
			if (!currentDialog || currentDialog.type !== 'alert') return

			currentDialog.resolve()
			set({ dialog: null })
		},
	}),
)
