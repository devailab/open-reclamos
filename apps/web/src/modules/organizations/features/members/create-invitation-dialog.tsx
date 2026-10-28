import { Copy, Link2, Mail } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import SelectField, {
	type SelectOption,
} from '@/shared/components/forms/select-field'
import TextField from '@/shared/components/forms/text-field'
import { Button } from '@/shared/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/shared/components/ui/dialog'
import { useForm } from '@/shared/hooks/use-form'
import { combine, email, required } from '@/shared/lib/validators'
import { createInvitation, listStores, sendInvitation } from './api'
import { ROLE_OPTIONS, type StoreAccessMode, type StoreOption } from './types'
import { UserStoreAccessEditor } from './user-store-access-editor'

interface Values {
	email: string | null
	role: SelectOption | null
}

const INITIAL_VALUES: Values = { email: null, role: null }

export function CreateInvitationDialog({
	open,
	onOpenChange,
	onCreated,
	actorAllStores,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	onCreated: (result: { inviteUrl: string; token: string }) => void
	actorAllStores: boolean
}) {
	const [values, setValues] = useState<Values>(INITIAL_VALUES)

	const { register, validate, reset } = useForm({
		values,
		setValues,
		initialValues: INITIAL_VALUES,
	})

	const [mode, setMode] = useState<StoreAccessMode>(
		actorAllStores ? 'all' : 'selected',
	)

	const [storeIds, setStoreIds] = useState<string[]>([])
	const [stores, setStores] = useState<StoreOption[]>([])
	const [loadError, setLoadError] = useState<string | null>(null)
	const [attempt, setAttempt] = useState(0)
	const [loading, setLoading] = useState(true)

	const [created, setCreated] = useState<{
		id: string
		token: string
		url: string
	} | null>(null)

	const [pending, startTransition] = useTransition()
	// biome-ignore lint/correctness/useExhaustiveDependencies: El contador permite reintentar la carga de tiendas.
	useEffect(() => {
		if (!open) {
			return
		}

		const controller = new AbortController()

		setLoading(true)
		setLoadError(null)

		listStores(controller.signal)
			.then((result) => {
				if (!controller.signal.aborted) {
					setStores(result)
				}
			})
			.catch((error) => {
				if (!controller.signal.aborted) {
					setLoadError(
						error instanceof Error
							? error.message
							: 'No se pudieron cargar las tiendas.',
					)
				}
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					setLoading(false)
				}
			})

		return () => controller.abort()
	}, [open, attempt])

	const close = (next: boolean) => {
		if (pending) {
			return
		}

		if (!next) {
			reset()
			setCreated(null)
			setStoreIds([])
			setMode(actorAllStores ? 'all' : 'selected')
		}

		onOpenChange(next)
	}

	const submit = () => {
		if (validate().length) {
			return
		}

		const role = values.role?.value

		if (role !== 'admin' && role !== 'operator' && role !== 'viewer') {
			return
		}

		startTransition(async () => {
			try {
				const result = await createInvitation({
					email: (values.email ?? '').trim().toLowerCase(),
					role,
					store_access_mode: mode,
					store_ids: mode === 'all' ? [] : storeIds,
				})

				setCreated(result)
				onCreated({ inviteUrl: result.url, token: result.token })
				sileo.success({ title: 'Invitación creada' })
			} catch (error) {
				sileo.error({
					title: 'Error al crear invitación',
					description:
						error instanceof Error
							? error.message
							: 'Inténtalo nuevamente.',
				})
			}
		})
	}

	return (
		<Dialog open={open} onOpenChange={close}>
			<DialogContent className='sm:max-w-2xl'>
				<DialogHeader>
					<DialogTitle>Invitar usuario</DialogTitle>
				</DialogHeader>
				<div className='space-y-4'>
					<TextField
						{...register('email')}
						label='Correo electrónico'
						type='email'
						placeholder='usuario@empresa.com'
						validate={combine(required, email)}
						disabled={pending || Boolean(created)}
					/>
					<SelectField
						{...register('role')}
						label='Rol'
						options={ROLE_OPTIONS}
						validate={required}
						disabled={pending || Boolean(created)}
					/>
					{loadError && (
						<div role='alert'>
							{loadError}
							<Button
								variant='outline'
								onClick={() => setAttempt((value) => value + 1)}
							>
								Reintentar
							</Button>
						</div>
					)}
					<UserStoreAccessEditor
						mode={mode}
						storeIds={storeIds}
						stores={stores}
						actorAllStores={actorAllStores}
						onModeChange={setMode}
						onStoreIdsChange={setStoreIds}
						disabled={pending || loading || Boolean(created)}
					/>
					{created && (
						<div className='space-y-3 rounded-xl border border-dashed bg-muted/25 p-4'>
							<p className='text-sm font-medium'>
								Enlace listo para compartir
							</p>
							<p className='break-all text-sm text-muted-foreground'>
								{created.url}
							</p>
							<div className='flex gap-2'>
								<Button
									variant='outline'
									onClick={() => {
										void navigator.clipboard
											.writeText(created.url)
											.then(() =>
												sileo.success({
													title: 'Enlace copiado',
												}),
											)
											.catch(() =>
												sileo.error({
													title: 'No se pudo copiar el enlace',
												}),
											)
									}}
								>
									<Copy />
									Copiar
								</Button>
								<Button
									variant='outline'
									disabled={pending}
									onClick={() =>
										startTransition(async () => {
											try {
												await sendInvitation(
													created.id,
													created.token,
												)
											} catch (error) {
												sileo.error({
													title: 'Error al enviar correo',
													description:
														error instanceof Error
															? error.message
															: 'Inténtalo nuevamente.',
												})
											}
										})
									}
								>
									<Mail />
									Enviar correo
								</Button>
							</div>
						</div>
					)}
				</div>
				<DialogFooter>
					<Button
						variant='outline'
						disabled={pending}
						onClick={() => close(false)}
					>
						{created ? 'Cerrar' : 'Cancelar'}
					</Button>
					{!created && (
						<Button
							disabled={pending || loading || Boolean(loadError)}
							onClick={submit}
						>
							<Link2 />
							{pending ? 'Generando...' : 'Generar invitación'}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
