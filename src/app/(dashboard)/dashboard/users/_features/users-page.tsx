'use client'

import { Plus, RefreshCcw, ShieldUser } from 'lucide-react'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import { CopyButton } from '@/components/copy-button'
import DataTable from '@/components/data-table'
import TableFiltersBar from '@/components/table-filters-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { useDataTable } from '@/hooks/use-data-table'
import { feedback } from '@/lib/feedback'
import { formatDateDisplay } from '@/lib/formatters'
import {
	$getInvitationsTableAction,
	$getUsersTableAction,
	$revokeInvitationAction,
} from '@/modules/users/actions'
import {
	DEFAULT_USERS_TABLE_FILTERS,
	type UsersTableFilters,
} from '@/modules/users/validation'
import { CreateInvitationDialog } from './create-invitation-dialog'
import { EditUserDialog } from './edit-user-dialog'
import type { InvitationRow, UserRow, UsersPageProps } from './types'

export function UsersPage({ initialState }: UsersPageProps) {
	const [userRows, setUserRows] = useState<UserRow[]>(initialState.users)
	const [userFilters, setUserFilters] = useState<UsersTableFilters>(
		initialState.userFilters,
	)
	const [invitationRows, setInvitationRows] = useState<InvitationRow[]>(
		initialState.invitations,
	)
	const [invitationFilters, setInvitationFilters] =
		useState<UsersTableFilters>(initialState.invitationFilters)
	const [isCreateInvitationOpen, setCreateInvitationOpen] = useState(false)
	const [createdInvitation, setCreatedInvitation] = useState<{
		inviteUrl: string
		token: string
	} | null>(null)
	const [editingUser, setEditingUser] = useState<UserRow | null>(null)
	const [isRevoking, startRevokingTransition] = useTransition()

	const {
		controller: userController,
		defineColumns: defineUserColumns,
		search: searchUsers,
		page: userPage,
		pageSize: userPageSize,
		setPage: setUserPage,
		setTotalItems: setUserTotalItems,
		setIsLoading: setUserIsLoading,
	} = useDataTable({
		getRowId: (row: UserRow) => row.userId,
		setRows: setUserRows,
		fetchData: async ({ page, pageSize, filters }) => {
			const result = await $getUsersTableAction({
				page,
				pageSize,
				filters,
			})

			return {
				rows: result.rows,
				totalItems: result.totalItems,
				page: result.page,
			}
		},
		filters: userFilters,
		setFilters: setUserFilters,
		onRowClick: (row) => setEditingUser(row),
	})

	const {
		controller: invitationController,
		defineColumns: defineInvitationColumns,
		search: searchInvitations,
		page: invitationPage,
		pageSize: invitationPageSize,
		setPage: setInvitationPage,
		setTotalItems: setInvitationTotalItems,
		setIsLoading: setInvitationIsLoading,
	} = useDataTable({
		getRowId: (row: InvitationRow) => row.id,
		setRows: setInvitationRows,
		fetchData: async ({ page, pageSize, filters }) => {
			const result = await $getInvitationsTableAction({
				page,
				pageSize,
				filters,
			})

			return {
				rows: result.rows,
				totalItems: result.totalItems,
				page: result.page,
			}
		},
		filters: invitationFilters,
		setFilters: setInvitationFilters,
	})

	useEffect(() => {
		setUserTotalItems(initialState.usersTotalItems)
		setUserIsLoading(false)
	}, [initialState.usersTotalItems, setUserIsLoading, setUserTotalItems])

	useEffect(() => {
		setInvitationTotalItems(initialState.invitationsTotalItems)
		setInvitationIsLoading(false)
	}, [
		initialState.invitationsTotalItems,
		setInvitationIsLoading,
		setInvitationTotalItems,
	])

	// biome-ignore lint/correctness/useExhaustiveDependencies: Se refresca cuando cambia la paginacion.
	useEffect(() => {
		void searchUsers()
	}, [userPage, userPageSize])

	// biome-ignore lint/correctness/useExhaustiveDependencies: Se refresca cuando cambia la paginacion.
	useEffect(() => {
		void searchInvitations()
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
				row.storeAccessMode === 'all'
					? 'Todas'
					: `${row.selectedStoresCount} seleccionadas`,
		},
		{
			header: { render: () => 'Permisos extra' },
			cell: ({ row }) =>
				row.permissionCount > 0
					? `${row.permissionCount} permiso(s)`
					: 'Sin permisos extra',
		},
		{
			header: { render: () => 'Actualizado' },
			cell: ({ row }) =>
				formatDateDisplay(row.updatedAt ?? row.createdAt),
		},
		{
			header: { render: () => 'Acciones' },
			cell: ({ row }) => (
				<Button
					type='button'
					variant='outline'
					size='icon-sm'
					title='Editar acceso'
					onClick={(event) => {
						event.stopPropagation()
						setEditingUser(row)
					}}
				>
					<ShieldUser />
					<span className='sr-only'>Editar acceso</span>
				</Button>
			),
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
				row.storeAccessMode === 'all'
					? 'Todas'
					: `${row.storeIds.length} seleccionadas`,
		},
		{
			header: { render: () => 'Expira' },
			cell: ({ row }) => formatDateDisplay(row.expiresAt),
		},
		{
			header: { render: () => 'Acciones' },
			cell: ({ row }) => (
				<Button
					type='button'
					variant='destructive'
					size='icon-sm'
					disabled={isRevoking}
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
								if (!confirmed) return

								startRevokingTransition(async () => {
									const result =
										await $revokeInvitationAction(row.id)
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
			),
		},
	])

	return (
		<div className='space-y-6'>
			<div className='flex flex-wrap items-start justify-between gap-4'>
				<div className='space-y-1'>
					<h1 className='text-2xl font-semibold'>Usuarios</h1>
					<p className='max-w-2xl text-sm text-muted-foreground'>
						Gestiona el acceso del equipo, los enlaces de invitación
						y el alcance por tiendas de cada miembro.
					</p>
				</div>
				<Button onClick={() => setCreateInvitationOpen(true)}>
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
							void searchUsers()
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
							void searchInvitations()
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
				onCreated={setCreatedInvitation}
				roles={initialState.roleOptions}
				stores={initialState.storeOptions}
			/>

			<EditUserDialog
				user={editingUser}
				onClose={() => setEditingUser(null)}
				onSuccess={() => {
					setEditingUser(null)
					void searchUsers()
				}}
				roles={initialState.roleOptions}
				permissions={initialState.permissionOptions}
				stores={initialState.storeOptions}
			/>
		</div>
	)
}
