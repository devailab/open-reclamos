import { TriangleAlert } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import SelectField, {
	type SelectOption,
} from '@/shared/components/forms/select-field'
import TextField from '@/shared/components/forms/text-field'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/shared/components/ui/dialog'
import { Label } from '@/shared/components/ui/label'
import { useForm } from '@/shared/hooks/use-form'
import { required } from '@/shared/lib/validators'
import { saveWebhook } from './api'
import {
	ALL_WEBHOOK_EVENTS,
	WEBHOOK_EVENT_DESCRIPTIONS,
	WEBHOOK_EVENT_LABELS,
} from './events'
import type { WebhookEndpointRow, WebhookFormValues } from './types'
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

	// Sincronizar al abrir o cambiar el webhook a editar; el secreto nunca se
	// precarga: en edición, vacío significa conservar el actual
	useEffect(() => {
		if (!open) {
			return
		}

		if (webhook) {
			setValues({
				name: webhook.name,
				targetUrl: webhook.targetUrl,
				events: [...webhook.events],
				status: webhook.status,
				secret: '',
				timeoutMs: webhook.timeoutMs,
			})
		} else {
			setValues(INITIAL_WEBHOOK_FORM_VALUES)
		}
	}, [open, webhook])

	const { register, validate } = useForm({ values, setValues })

	const selectedStatus =
		STATUS_OPTIONS.find((o) => o.value === values.status) ??
		STATUS_OPTIONS[0]

	const isRotatingSecret = isEditing && values.secret.trim().length > 0

	const toggleEvent = (eventKey: string) => {
		setValues((prev) => ({
			...prev,
			events: prev.events.includes(eventKey)
				? prev.events.filter((e) => e !== eventKey)
				: [...prev.events, eventKey],
		}))
	}

	const handleSubmit = () => {
		if (validate().length > 0) {
			return
		}

		startTransition(async () => {
			const result = await saveWebhook(values, webhook?.id)

			if ('error' in result) {
				sileo.error({
					title: isEditing
						? 'Error al actualizar webhook'
						: 'Error al crear webhook',
					description: result.error,
				})

				return
			}

			if (isRotatingSecret) {
				sileo.warning({
					title: 'Secreto actualizado',
					description:
						'El secreto anterior dejó de ser válido. Actualiza la configuración en el receptor.',
				})
			}

			sileo.success({
				title: isEditing ? 'Webhook actualizado' : 'Webhook creado',
			})

			setValues(INITIAL_WEBHOOK_FORM_VALUES)
			onSuccess()
		})
	}

	const handleOpenChange = (nextOpen: boolean) => {
		if (isPending) {
			return
		}
		if (!nextOpen) {
			setValues(INITIAL_WEBHOOK_FORM_VALUES)
		}

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
						{...register('name')}
						validate={required}
						label='Nombre'
						placeholder='Mi integración'
						value={values.name}
						onValueChange={(v) =>
							setValues((p) => ({ ...p, name: v ?? '' }))
						}
						disabled={isPending}
					/>

					<TextField
						{...register('targetUrl')}
						validate={required}
						label='URL de destino'
						placeholder='https://mi-servidor.com/webhook'
						value={values.targetUrl}
						onValueChange={(v) =>
							setValues((p) => ({ ...p, targetUrl: v ?? '' }))
						}
						disabled={isPending}
					/>

					<div className='space-y-1.5'>
						<TextField
							{...register('secret')}
							validate={(value) =>
								!isEditing || value
									? value &&
										value.length >= 16 &&
										value.length <= 256
										? null
										: 'El secreto debe tener entre 16 y 256 caracteres.'
									: null
							}
							label='Secreto'
							type='password'
							placeholder={
								isEditing
									? '••••••••••••••••'
									: 'Mínimo 16 caracteres'
							}
							value={values.secret}
							onValueChange={(v) =>
								setValues((p) => ({ ...p, secret: v ?? '' }))
							}
							disabled={isPending}
						/>
						{isRotatingSecret ? (
							<p className='flex items-center gap-1.5 text-xs text-amber-600'>
								<TriangleAlert className='size-3.5 shrink-0' />
								Al guardar, el secreto anterior dejará de ser
								válido y el receptor deberá actualizar su
								configuración.
							</p>
						) : (
							<p className='text-xs text-muted-foreground'>
								{isEditing
									? 'Déjalo en blanco para mantener el secreto actual.'
									: 'Se usará para firmar cada envío con HMAC-SHA256. Configura el mismo valor en tu receptor.'}
							</p>
						)}
					</div>

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
