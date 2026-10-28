import { PermissionAdmin } from '@open-reclamos/rpc-client'
import { Plus, RefreshCcw, ShieldUser } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import { useSession } from '@/shared/auth/session'
import { CopyButton } from '@/shared/components/copy-button'
import DataTable from '@/shared/components/data-table'
import TableFiltersBar from '@/shared/components/table-filters-bar'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/shared/components/ui/card'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/shared/components/ui/empty'
import { Input } from '@/shared/components/ui/input'
import { useDataTable } from '@/shared/hooks/use-data-table'
import { feedback } from '@/shared/lib/feedback'
import { formatDateDisplay } from '@/shared/lib/formatters'
import {
	getInvitationsTable,
	getUsersTable,
	removeUser,
	revokeInvitation,
	sendInvitation,
} from '../features/members/api'
import { CreateInvitationDialog } from '../features/members/create-invitation-dialog'
import { EditUserDialog } from '../features/members/edit-user-dialog'
import type { InvitationRow, UserRow } from '../features/members/types'
import {
	DEFAULT_USERS_TABLE_FILTERS,
	type UsersTableFilters,
} from '../features/members/types'

export function UsersPage() {
	const { session } = useSession()

	if (!session?.organization_id) {
		return <p role='status'>Selecciona una organización para continuar.</p>
	}

	return <UsersPageContent key={session.organization_id} />
}

function UsersPageContent() {
	const { session } = useSession()
	const canManage = session?.capabilities?.[PermissionAdmin] === true
	const actorAllStores = session?.all_stores === true
	const [userRows, setUserRows] = useState<UserRow[]>([])

	const [userFilters, setUserFilters] = useState<UsersTableFilters>(
		DEFAULT_USERS_TABLE_FILTERS,
	)

	const [invitationRows, setInvitationRows] = useState<InvitationRow[]>([])

	const [invitationFilters, setInvitationFilters] =
		useState<UsersTableFilters>(DEFAULT_USERS_TABLE_FILTERS)

	const totalRef = useRef(0)
	const invitationTotalRef = useRef(0)

	const [loadError, setLoadError] = useState<string | null>(null)
	const [isCreateInvitationOpen, setCreateInvitationOpen] = useState(false)

	const [createdInvitation, setCreatedInvitation] = useState<{
		inviteUrl: string
		token: string
	} | null>(null)

	const [editingUser, setEditingUser] = useState<UserRow | null>(null)
	const [isRevoking, startRevokingTransition] = useTransition()

	const canManageRow = (_row: UserRow) => canManage

	const {
		controller: userController,
		defineColumns: defineUserColumns,
		search: searchUsers,
		autoSearch: autoSearchUsers,
		page: userPage,
		pageSize: userPageSize,
		setPage: setUserPage,
	} = useDataTable({
		getRowId: (row: UserRow) => row.userId,
		setRows: setUserRows,
		fetchData: async ({ page, pageSize, filters }) => {
			try {
				setLoadError(null)

				const result = await getUsersTable({
					page,
					pageSize,
					filters,
				})

				totalRef.current = result.totalItems

				return {
					rows: result.rows,
					totalItems: result.totalItems,
					page: result.page,
				}
			} catch (error) {
				setLoadError(
					error instanceof Error
						? error.message
						: 'No se pudo cargar la tabla.',
				)

				return {
					rows: userRows,
					totalItems: totalRef.current,
					page,
				}
			}
		},
		filters: userFilters,
		setFilters: setUserFilters,
		onRowClick: (row) => {
			if (canManageRow(row)) {
				setEditingUser(row)
			}
		},
		hasInitialData: false,
	})

	const {
		controller: invitationController,
		defineColumns: defineInvitationColumns,
		search: searchInvitations,
		autoSearch: autoSearchInvitations,
		page: invitationPage,
		pageSize: invitationPageSize,
		setPage: setInvitationPage,
	} = useDataTable({
		getRowId: (row: InvitationRow) => row.id,
		setRows: setInvitationRows,
		fetchData: async ({ page, pageSize, filters }) => {
			try {
				setLoadError(null)

				const result = await getInvitationsTable({
					page,
					pageSize,
					filters,
				})

				invitationTotalRef.current = result.totalItems

				return {
					rows: result.rows,
					totalItems: result.totalItems,
					page: result.page,
				}
			} catch (error) {
				setLoadError(
					error instanceof Error
						? error.message
						: 'No se pudo cargar la tabla.',
				)

				return {
					rows: invitationRows,
					totalItems: invitationTotalRef.current,
					page,
				}
			}
		},
		filters: invitationFilters,
		setFilters: setInvitationFilters,
		hasInitialData: false,
	})

	// biome-ignore lint/correctness/useExhaustiveDependencies: Se refresca cuando cambia la paginacion.
	useEffect(() => {
		autoSearchUsers()
	}, [userPage, userPageSize])

	// biome-ignore lint/correctness/useExhaustiveDependencies: Se refresca cuando cambia la paginacion.
	useEffect(() => {
		autoSearchInvitations()
	}, [invitationPage, invitationPageSize])

	const hasUserFilters = useMemo(() => {
		return userFilters.search.trim() !== DEFAULT_USERS_TABLE_FILTERS.search
	}, [userFilters.search])

	const hasInvitationFilters = useMemo(() => {
		return (
			invitationFilters.search.trim() !==
			DEFAULT_USERS_TABLE_FILTERS.search
		)
	}, [invitationFilters.search])

	const userColumns = defineUserColumns([
		{
			header: { render: () => 'Usuario' },
			cell: ({ row }) => (
				<div className='space-y-0.5'>
					<p className='text-sm font-medium'>{row.name}</p>
					<p className='text-xs text-muted-foreground'>{row.email}</p>
				</div>
			),
		},
		{
			header: { render: () => 'Rol' },
			cell: ({ row }) => (
				<Badge variant='secondary'>{row.roleName}</Badge>
			),
		},
		{
			header: { render: () => 'Tiendas' },
			cell: ({ row }) =>
				row.storeAccessMode === 'all' ? 'Todas' : 'Seleccionadas',
		},
		{
			header: { render: () => 'Ingreso al equipo' },
			cell: ({ row }) => formatDateDisplay(row.createdAt),
		},
		{
			header: { render: () => 'Acciones' },
			cell: ({ row }) => {
				const isManageable = canManageRow(row)

				return (
					<div className='flex gap-2'>
						<Button
							variant='destructive'
							size='sm'
							disabled={!canManage || isRevoking}
							onClick={(event) => {
								event.stopPropagation()

								void feedback
									.confirm({
										title: 'Quitar usuario',
										description: `Se quitará el acceso de ${row.name}.`,
										confirmText: 'Quitar',
										cancelText: 'Cancelar',
										variant: 'destructive',
									})
									.then((confirmed) => {
										if (confirmed) {
											startRevokingTransition(
												async () => {
													const result =
														await removeUser(
															row.userId,
														)

													if ('error' in result) {
														sileo.error({
															title: 'Error al quitar usuario',
															description:
																result.error,
														})
													} else {
														sileo.success({
															title: 'Usuario eliminado del equipo',
														})

														void searchUsers()
													}
												},
											)
										}
									})
							}}
						>
							Quitar
						</Button>
						<Button
							type='button'
							variant='outline'
							size='icon-sm'
							disabled={!isManageable}
							title={
								isManageable
									? 'Editar acceso'
									: 'Solo los administradores pueden gestionar usuarios'
							}
							onClick={(event) => {
								event.stopPropagation()

								if (isManageable) {
									setEditingUser(row)
								}
							}}
						>
							<ShieldUser />
							<span className='sr-only'>Editar acceso</span>
						</Button>
					</div>
				)
			},
		},
	])

	const invitationColumns = defineInvitationColumns([
		{
			header: { render: () => 'Correo' },
			cell: ({ row }) => (
				<div className='space-y-0.5'>
					<p className='text-sm font-medium'>{row.email}</p>
					<p className='text-xs text-muted-foreground'>
						{row.roleName}
					</p>
				</div>
			),
		},
		{
			header: { render: () => 'Tiendas' },
			cell: ({ row }) =>
				row.storeAccessMode === 'all' ? 'Todas' : 'Seleccionadas',
		},
		{
			header: { render: () => 'Expira' },
			cell: ({ row }) => formatDateDisplay(row.expiresAt),
		},
		{
			header: { render: () => 'Acciones' },
			cell: ({ row }) => (
				<div className='flex gap-2'>
					<Button
						variant='outline'
						disabled={!canManage || isRevoking}
						onClick={() => {
							startRevokingTransition(async () => {
								try {
									const result = await sendInvitation(row.id)

									if (result.url) {
										setCreatedInvitation({
											inviteUrl: result.url,
											token: '',
										})
									}

									void searchInvitations()
								} catch (error) {
									sileo.error({
										title: 'Error al enviar invitación',
										description:
											error instanceof Error
												? error.message
												: 'Inténtalo nuevamente.',
									})
								}
							})
						}}
					>
						Enviar / renovar enlace
					</Button>
					<Button
						type='button'
						variant='destructive'
						size='icon-sm'
						disabled={!canManage || isRevoking}
						title='Revocar invitación'
						onClick={(event) => {
							event.stopPropagation()

							feedback
								.confirm({
									title: 'Revocar invitación',
									description: `Se revocará la invitación para ${row.email}. Esta acción no se puede deshacer.`,
									confirmText: 'Revocar',
									cancelText: 'Cancelar',
									variant: 'destructive',
								})
								.then((confirmed) => {
									if (!confirmed) {
										return
									}

									startRevokingTransition(async () => {
										const result = await revokeInvitation(
											row.id,
										)

										if ('error' in result) {
											sileo.error({
												title: 'Error al revocar invitación',
												description: result.error,
											})

											return
										}

										sileo.success({
											title: 'Invitación revocada',
										})

										void searchInvitations()
									})
								})
						}}
					>
						<RefreshCcw />
						<span className='sr-only'>Revocar invitación</span>
					</Button>
				</div>
			),
		},
	])

	return (
		<div className='space-y-6'>
			{loadError && (
				<div
					role='alert'
					className='rounded-lg border border-destructive/30 p-4 text-sm'
				>
					{loadError}
					<Button
						variant='outline'
						onClick={() => {
							void searchUsers()
							void searchInvitations()
						}}
					>
						Reintentar
					</Button>
				</div>
			)}
			<div className='flex flex-wrap items-start justify-between gap-4'>
				<div className='space-y-1'>
					<h1 className='text-2xl font-semibold'>Usuarios</h1>
					<p className='max-w-2xl text-sm text-muted-foreground'>
						Gestiona el acceso del equipo, los enlaces de invitación
						y el alcance por tiendas de cada miembro.
					</p>
				</div>
				<Button
					disabled={!canManage}
					onClick={() => setCreateInvitationOpen(true)}
				>
					<Plus />
					Nueva invitación
				</Button>
			</div>

			{createdInvitation && (
				<Card className='border-primary/20 bg-primary/5'>
					<CardContent className='flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between'>
						<div className='space-y-1'>
							<p className='text-sm font-medium'>
								Enlace listo para compartir
							</p>
							<p className='text-sm text-muted-foreground'>
								Copia el enlace y envíalo al usuario invitado.
							</p>
						</div>
						<div className='flex items-center gap-2'>
							<code className='max-w-[16rem] truncate rounded-lg bg-background px-3 py-2 text-xs'>
								{createdInvitation.inviteUrl}
							</code>
							<CopyButton value={createdInvitation.inviteUrl} />
							<Button
								type='button'
								variant='outline'
								onClick={() => setCreatedInvitation(null)}
							>
								Cerrar
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader className='flex flex-row items-center justify-between gap-4'>
					<CardTitle>Usuarios del equipo</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4'>
					<TableFiltersBar
						primaryFilters={[
							<Input
								key='users-search'
								value={userFilters.search}
								onChange={(event) =>
									setUserFilters((current) => ({
										...current,
										search: event.target.value,
									}))
								}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault()

										if (userPage !== 1) {
											setUserPage(1)

											return
										}

										void searchUsers()
									}
								}}
								placeholder='Buscar por nombre, correo o rol'
							/>,
						]}
						onSearch={() => {
							if (userPage !== 1) {
								setUserPage(1)

								return
							}

							void searchUsers()
						}}
						onClear={() => {
							setUserFilters(DEFAULT_USERS_TABLE_FILTERS)

							if (userPage !== 1) {
								setUserPage(1)

								return
							}

							void searchUsers(DEFAULT_USERS_TABLE_FILTERS)
						}}
						hasActiveFilters={hasUserFilters}
					/>

					{userRows.length === 0 ? (
						<Empty className='border py-12'>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<ShieldUser />
								</EmptyMedia>
								<EmptyContent>
									<EmptyTitle>
										Sin usuarios registrados
									</EmptyTitle>
									<EmptyDescription>
										Los usuarios aparecerán aquí cuando
										acepten una invitación.
									</EmptyDescription>
								</EmptyContent>
							</EmptyHeader>
						</Empty>
					) : (
						<DataTable
							controller={userController}
							columns={userColumns}
							rows={userRows}
						/>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className='flex flex-row items-center justify-between gap-4'>
					<CardTitle>Invitaciones pendientes</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4'>
					<TableFiltersBar
						primaryFilters={[
							<Input
								key='invitation-search'
								value={invitationFilters.search}
								onChange={(event) =>
									setInvitationFilters((current) => ({
										...current,
										search: event.target.value,
									}))
								}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault()

										if (invitationPage !== 1) {
											setInvitationPage(1)

											return
										}

										void searchInvitations()
									}
								}}
								placeholder='Buscar por correo o rol'
							/>,
						]}
						onSearch={() => {
							if (invitationPage !== 1) {
								setInvitationPage(1)

								return
							}

							void searchInvitations()
						}}
						onClear={() => {
							setInvitationFilters(DEFAULT_USERS_TABLE_FILTERS)

							if (invitationPage !== 1) {
								setInvitationPage(1)

								return
							}

							void searchInvitations(DEFAULT_USERS_TABLE_FILTERS)
						}}
						hasActiveFilters={hasInvitationFilters}
					/>

					{invitationRows.length === 0 ? (
						<Empty className='border py-12'>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<Plus />
								</EmptyMedia>
								<EmptyContent>
									<EmptyTitle>
										Sin invitaciones pendientes
									</EmptyTitle>
									<EmptyDescription>
										Crea un enlace para invitar a una nueva
										persona al equipo.
									</EmptyDescription>
								</EmptyContent>
							</EmptyHeader>
						</Empty>
					) : (
						<DataTable
							controller={invitationController}
							columns={invitationColumns}
							rows={invitationRows}
						/>
					)}
				</CardContent>
			</Card>

			<CreateInvitationDialog
				open={isCreateInvitationOpen}
				onOpenChange={setCreateInvitationOpen}
				onCreated={(result) => {
					setCreatedInvitation(result)
					void searchInvitations()
				}}
				actorAllStores={actorAllStores}
			/>

			<EditUserDialog
				user={editingUser}
				onClose={() => setEditingUser(null)}
				onSuccess={() => {
					setEditingUser(null)
					void searchUsers()
				}}
				actorAllStores={actorAllStores}
			/>
		</div>
	)
}
