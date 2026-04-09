'use client'

import { Copy, Link2, Mail } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import SelectField, { type SelectOption } from '@/components/forms/select-field'
import TextField from '@/components/forms/text-field'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import type { RoleOption, StoreOption } from '@/modules/rbac/queries'
import {
	$createUserInvitationAction,
	$sendInvitationEmailAction,
} from '@/modules/users/actions'
import {
	normalizeInvitationInput,
	type UserInvitationInput,
	validateInvitationInput,
} from '@/modules/users/validation'
import { UserStoreAccessEditor } from './user-store-access-editor'

interface CreateInvitationDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onCreated: (payload: { inviteUrl: string; token: string }) => void
	roles: RoleOption[]
	stores: StoreOption[]
}

interface InvitationFormValues {
	email: string | null
	role: SelectOption | null
	storeAccessMode: 'all' | 'selected'
	storeIds: string[]
}

const INITIAL_VALUES: InvitationFormValues = {
	email: null,
	role: null,
	storeAccessMode: 'all',
	storeIds: [],
}

export function CreateInvitationDialog({
	open,
	onOpenChange,
	onCreated,
	roles,
	stores,
}: CreateInvitationDialogProps) {
	const [values, setValues] = useState(INITIAL_VALUES)
	const [lastInvitationUrl, setLastInvitationUrl] = useState<string | null>(
		null,
	)
	const [emailSent, setEmailSent] = useState(false)
	const [isPending, startTransition] = useTransition()
	const [isSendingEmail, startEmailTransition] = useTransition()

	const roleOptions = useMemo<SelectOption[]>(
		() =>
			roles.map((role) => ({
				value: role.id,
				label: role.name,
			})),
		[roles],
	)

	const resetForm = () => {
		setValues(INITIAL_VALUES)
		setLastInvitationUrl(null)
		setEmailSent(false)
	}

	const handleSubmit = () => {
		const payload: UserInvitationInput = {
			email: values.email ?? '',
			roleId: values.role?.value ?? '',
			storeAccessMode: values.storeAccessMode,
			storeIds: values.storeIds,
		}

		const validationError = validateInvitationInput(
			normalizeInvitationInput(payload),
		)
		if (validationError) {
			sileo.error({
				title: 'Error al crear invitación',
				description: validationError,
			})
			return
		}

		startTransition(async () => {
			const result = await $createUserInvitationAction(payload)
			if ('error' in result) {
				sileo.error({
					title: 'Error al crear invitación',
					description: result.error,
				})
				return
			}

			const inviteUrl = `${window.location.origin}${result.inviteUrl}`
			setLastInvitationUrl(inviteUrl)
			sileo.success({ title: 'Invitación creada' })
			onCreated({ inviteUrl, token: result.token })
		})
	}

	const handleCopy = async () => {
		if (!lastInvitationUrl) return
		await navigator.clipboard.writeText(lastInvitationUrl)
		sileo.success({ title: 'Enlace copiado' })
	}

	const handleSendEmail = () => {
		if (!lastInvitationUrl || !values.email) return
		startEmailTransition(async () => {
			const result = await $sendInvitationEmailAction({
				email: values.email ?? '',
				inviteUrl: lastInvitationUrl,
			})
			if ('error' in result) {
				sileo.error({
					title: 'Error al enviar correo',
					description: result.error,
				})
				return
			}
			setEmailSent(true)
			sileo.success({
				title: 'Correo enviado',
				description: `El enlace fue enviado a ${values.email}`,
			})
		})
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) resetForm()
				onOpenChange(nextOpen)
			}}
		>
			<DialogContent className='sm:max-w-2xl'>
				<DialogHeader>
					<DialogTitle>Invitar usuario</DialogTitle>
				</DialogHeader>

				<div className='space-y-4'>
					<TextField
						label='Correo electrónico'
						placeholder='usuario@empresa.com'
						type='email'
						value={values.email}
						onValueChange={(value) =>
							setValues((previous) => ({
								...previous,
								email: value,
							}))
						}
						disabled={isPending}
					/>

					<SelectField
						label='Rol'
						placeholder='Selecciona un rol'
						options={roleOptions}
						value={values.role}
						onValueChange={(value) =>
							setValues((previous) => ({
								...previous,
								role: value,
							}))
						}
						disabled={isPending}
					/>

					<UserStoreAccessEditor
						storeAccessMode={values.storeAccessMode}
						storeIds={values.storeIds}
						storeOptions={stores}
						onStoreAccessModeChange={(storeAccessMode) =>
							setValues((previous) => ({
								...previous,
								storeAccessMode,
								storeIds:
									storeAccessMode === 'all'
										? []
										: previous.storeIds,
							}))
						}
						onStoreIdsChange={(storeIds) =>
							setValues((previous) => ({ ...previous, storeIds }))
						}
						disabled={isPending}
					/>

					{lastInvitationUrl && (
						<div className='rounded-xl border border-dashed bg-muted/25 p-4'>
							<div className='flex items-start justify-between gap-3'>
								<div className='min-w-0 space-y-1'>
									<p className='text-sm font-medium'>
										Enlace listo para compartir
									</p>
									<p className='break-all text-sm text-muted-foreground'>
										{lastInvitationUrl}
									</p>
								</div>
								<div className='flex shrink-0 gap-2'>
									<Button
										type='button'
										variant='outline'
										size='sm'
										onClick={handleCopy}
										disabled={isSendingEmail}
									>
										<Copy />
										Copiar
									</Button>
									<Button
										type='button'
										variant='outline'
										size='sm'
										onClick={handleSendEmail}
										disabled={isSendingEmail || emailSent}
									>
										<Mail />
										{isSendingEmail
											? 'Enviando...'
											: emailSent
												? 'Enviado'
												: 'Enviar correo'}
									</Button>
								</div>
							</div>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button
						type='button'
						variant='outline'
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						Cancelar
					</Button>
					<Button
						type='button'
						onClick={handleSubmit}
						disabled={isPending}
					>
						{isPending ? (
							'Generando...'
						) : (
							<>
								<Link2 />
								Generar invitación
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
