'use client'

import { useEffect, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import SelectField, { type SelectOption } from '@/components/forms/select-field'
import TextField from '@/components/forms/text-field'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
	ALL_WEBHOOK_EVENTS,
	WEBHOOK_EVENT_DESCRIPTIONS,
	WEBHOOK_EVENT_LABELS,
} from '@/lib/webhook-events'
import {
	$createWebhookAction,
	$updateWebhookAction,
} from '@/modules/webhooks/actions'
import type { WebhookEndpointRow } from '@/modules/webhooks/queries'
import type { WebhookFormValues } from './types'
import { INITIAL_WEBHOOK_FORM_VALUES } from './types'

const STATUS_OPTIONS: SelectOption[] = [
	{ value: 'active', label: 'Activo' },
	{ value: 'inactive', label: 'Inactivo' },
]

interface WebhookFormDialogProps {
	webhook: WebhookEndpointRow | null
	open: boolean
	onOpenChange: (open: boolean) => void
	onSuccess: () => void
}

export function WebhookFormDialog({
	webhook,
	open,
	onOpenChange,
	onSuccess,
}: WebhookFormDialogProps) {
	const isEditing = Boolean(webhook)
	const [values, setValues] = useState<WebhookFormValues>(
		INITIAL_WEBHOOK_FORM_VALUES,
	)
	const [isPending, startTransition] = useTransition()

	// Sincronizar cuando cambia el webhook a editar
	useEffect(() => {
		if (webhook) {
			setValues({
				name: webhook.name,
				targetUrl: webhook.targetUrl,
				events: [...webhook.events],
				status: webhook.status,
			})
		} else {
			setValues(INITIAL_WEBHOOK_FORM_VALUES)
		}
	}, [webhook])

	const selectedStatus =
		STATUS_OPTIONS.find((o) => o.value === values.status) ??
		STATUS_OPTIONS[0]

	const toggleEvent = (eventKey: string) => {
		setValues((prev) => ({
			...prev,
			events: prev.events.includes(eventKey)
				? prev.events.filter((e) => e !== eventKey)
				: [...prev.events, eventKey],
		}))
	}

	const handleSubmit = () => {
		startTransition(async () => {
			const result =
				isEditing && webhook
					? await $updateWebhookAction({ ...values, id: webhook.id })
					: await $createWebhookAction(values)

			if ('error' in result) {
				sileo.error({
					title: isEditing
						? 'Error al actualizar webhook'
						: 'Error al crear webhook',
					description: result.error,
				})
				return
			}

			sileo.success({
				title: isEditing ? 'Webhook actualizado' : 'Webhook creado',
			})
			onSuccess()
		})
	}

	const handleOpenChange = (nextOpen: boolean) => {
		if (isPending) return
		onOpenChange(nextOpen)
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className='sm:max-w-2xl'>
				<DialogHeader>
					<DialogTitle>
						{isEditing ? 'Editar webhook' : 'Nuevo webhook'}
					</DialogTitle>
				</DialogHeader>

				<div className='space-y-4 py-1'>
					<TextField
						label='Nombre'
						placeholder='Mi integración'
						value={values.name}
						onValueChange={(v) =>
							setValues((p) => ({ ...p, name: v ?? '' }))
						}
						disabled={isPending}
					/>

					<TextField
						label='URL de destino'
						placeholder='https://mi-servidor.com/webhook'
						value={values.targetUrl}
						onValueChange={(v) =>
							setValues((p) => ({ ...p, targetUrl: v ?? '' }))
						}
						disabled={isPending}
					/>

					<SelectField
						label='Estado'
						options={STATUS_OPTIONS}
						value={selectedStatus}
						onValueChange={(v) =>
							setValues((p) => ({
								...p,
								status: v?.value ?? 'active',
							}))
						}
						disabled={isPending}
					/>

					{/* Selector de eventos tipo multi-checkbox */}
					<div className='space-y-2'>
						<Label>
							Eventos
							{values.events.length > 0 && (
								<Badge variant='secondary' className='ml-2'>
									{values.events.length} seleccionado
									{values.events.length !== 1 ? 's' : ''}
								</Badge>
							)}
						</Label>
						<div className='rounded-lg border divide-y'>
							{ALL_WEBHOOK_EVENTS.map((eventKey) => (
								<label
									key={eventKey}
									htmlFor={`event-${eventKey}`}
									className='flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors'
								>
									<Checkbox
										id={`event-${eventKey}`}
										checked={values.events.includes(
											eventKey,
										)}
										onCheckedChange={() =>
											toggleEvent(eventKey)
										}
										disabled={isPending}
										className='mt-0.5'
									/>
									<div className='min-w-0'>
										<p className='text-sm font-medium leading-none'>
											{WEBHOOK_EVENT_LABELS[eventKey]}
										</p>
										<p className='mt-1 text-xs text-muted-foreground'>
											{
												WEBHOOK_EVENT_DESCRIPTIONS[
													eventKey
												]
											}
										</p>
										<code className='mt-1 inline-block text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded'>
											{eventKey}
										</code>
									</div>
								</label>
							))}
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant='ghost'
						onClick={() => handleOpenChange(false)}
						disabled={isPending}
					>
						Cancelar
					</Button>
					<Button onClick={handleSubmit} disabled={isPending}>
						{isPending
							? 'Guardando...'
							: isEditing
								? 'Guardar cambios'
								: 'Crear webhook'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
