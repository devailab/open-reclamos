import { useEffect, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import { useSession } from '@/shared/auth/session'
import SelectField, {
	type SelectOption,
} from '@/shared/components/forms/select-field'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/shared/components/ui/dialog'
import { getUserAccess, listStores, updateUserAccess } from './api'
import {
	type Access,
	ROLE_OPTIONS,
	type StoreOption,
	type UserRow,
} from './types'
import { UserStoreAccessEditor } from './user-store-access-editor'

export function EditUserDialog({
	user,
	onClose,
	onSuccess,
	actorAllStores,
}: {
	user: UserRow | null
	onClose: () => void
	onSuccess: () => void
	actorAllStores: boolean
}) {
	const { refresh } = useSession()
	const [access, setAccess] = useState<Access | null>(null)
	const [stores, setStores] = useState<StoreOption[]>([])
	const [error, setError] = useState<string | null>(null)
	const [attempt, setAttempt] = useState(0)
	const [pending, startTransition] = useTransition()
	// biome-ignore lint/correctness/useExhaustiveDependencies: El contador permite reintentar la carga de acceso.
	useEffect(() => {
		setAccess(null)
		setError(null)

		if (!user) {
			return
		}

		const controller = new AbortController()

		Promise.all([
			getUserAccess(user.userId, controller.signal),
			listStores(controller.signal),
		])
			.then(([nextAccess, nextStores]) => {
				if (!controller.signal.aborted) {
					setAccess(nextAccess)
					setStores(nextStores)
				}
			})
			.catch((error) => {
				if (!controller.signal.aborted) {
					setError(
						error instanceof Error
							? error.message
							: 'No se pudo cargar el acceso.',
					)
				}
			})

		return () => controller.abort()
	}, [user, attempt])

	const save = () => {
		if (!user || !access) {
			return
		}

		startTransition(async () => {
			try {
				await updateUserAccess(user.userId, {
					...access,
					store_ids:
						access.store_access_mode === 'all'
							? []
							: access.store_ids,
				})

				await refresh()
				sileo.success({ title: 'Usuario actualizado' })
				onSuccess()
			} catch (error) {
				sileo.error({
					title: 'Error al actualizar usuario',
					description:
						error instanceof Error
							? error.message
							: 'Inténtalo nuevamente.',
				})
			}
		})
	}

	return (
		<Dialog
			open={Boolean(user)}
			onOpenChange={(open) => !open && !pending && onClose()}
		>
			<DialogContent className='flex max-h-[90vh] flex-col sm:max-w-2xl'>
				<DialogHeader>
					<DialogTitle>Editar acceso del usuario</DialogTitle>
				</DialogHeader>
				{error ? (
					<div role='alert'>
						{error}
						<Button
							variant='outline'
							onClick={() => setAttempt((value) => value + 1)}
						>
							Reintentar
						</Button>
					</div>
				) : !access ? (
					<p role='status'>Cargando acceso...</p>
				) : (
					<div className='min-h-0 flex-1 space-y-4 overflow-y-auto'>
						<div className='rounded-xl border bg-muted/30 p-4'>
							<p className='text-sm font-medium'>{user?.name}</p>
							<p className='text-sm text-muted-foreground'>
								{user?.email}
							</p>
							<Badge variant='outline'>
								{access.store_access_mode === 'all'
									? 'Todas las tiendas'
									: `${access.store_ids.length} tienda(s)`}
							</Badge>
						</div>
						<SelectField
							label='Rol'
							options={ROLE_OPTIONS}
							value={
								ROLE_OPTIONS.find(
									(option) => option.value === access.role,
								) ?? null
							}
							onValueChange={(option: SelectOption | null) => {
								const role = option?.value

								if (
									role === 'admin' ||
									role === 'operator' ||
									role === 'viewer'
								) {
									setAccess({ ...access, role })
								}
							}}
							disabled={pending}
						/>
						<UserStoreAccessEditor
							mode={access.store_access_mode}
							storeIds={access.store_ids}
							stores={stores}
							actorAllStores={actorAllStores}
							onModeChange={(mode) =>
								setAccess({
									...access,
									store_access_mode: mode,
								})
							}
							onStoreIdsChange={(store_ids) =>
								setAccess({ ...access, store_ids })
							}
							disabled={pending}
						/>
					</div>
				)}
				<DialogFooter>
					<Button
						variant='outline'
						disabled={pending}
						onClick={onClose}
					>
						Cancelar
					</Button>
					<Button disabled={pending || !access} onClick={save}>
						{pending ? 'Guardando...' : 'Guardar cambios'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
