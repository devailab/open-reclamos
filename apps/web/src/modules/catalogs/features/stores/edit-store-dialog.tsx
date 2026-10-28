import { useEffect, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import AutocompleteField, {
	type AutocompleteOption,
} from '@/shared/components/forms/autocomplete-field'
import { PublicSlugField } from '@/shared/components/forms/public-slug-field'
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
import { Separator } from '@/shared/components/ui/separator'
import {
	ADDRESS_TYPE_OPTIONS,
	STORE_TYPE_OPTIONS,
} from '@/shared/constants/options'
import { usePublicSlug } from '@/shared/hooks/use-public-slug'
import { feedback } from '@/shared/lib/feedback'
import { searchUbigeos, type UpdateStoreActionInput, updateStore } from './api'
import { DEFAULT_STORE_COLOR } from './constants'
import { StoreColorField } from './store-color-field'
import type { StoreRow } from './types'
import {
	normalizeStoreMutationInput,
	validateStoreMutationInput,
} from './validation'

interface EditStoreDialogProps {
	store: StoreRow | null
	onClose: () => void
	onSuccess: () => void
}

interface StoreFormValues {
	name: string | null
	type: SelectOption | null
	color: string
	ubigeoOption: AutocompleteOption | null
	addressType: SelectOption | null
	address: string | null
	url: string | null
}

const EMPTY_VALUES: StoreFormValues = {
	name: null,
	type: null,
	color: DEFAULT_STORE_COLOR,
	ubigeoOption: null,
	addressType: null,
	address: null,
	url: null,
}

const getStoreTypeOption = (type: string | null): SelectOption | null => {
	if (!type) {
		return null
	}
	return STORE_TYPE_OPTIONS.find((option) => option.value === type) ?? null
}

const getAddressTypeOption = (
	addressType: string | null,
): SelectOption | null => {
	if (!addressType) {
		return null
	}

	return (
		ADDRESS_TYPE_OPTIONS.find((option) => option.value === addressType) ??
		null
	)
}

export function EditStoreDialog({
	store,
	onClose,
	onSuccess,
}: EditStoreDialogProps) {
	const open = store !== null
	const [values, setValues] = useState<StoreFormValues>(EMPTY_VALUES)
	const [isPending, startTransition] = useTransition()
	const publicSlug = usePublicSlug({
		kind: 'store',
		name: values.name ?? '',
		initialSlug: store?.slug,
		id: store?.id,
		enabled: open,
	})

	useEffect(() => {
		if (!store) {
			setValues(EMPTY_VALUES)

			return
		}

		setValues({
			name: store.name,
			type: getStoreTypeOption(store.type),
			color: store.color,
			ubigeoOption: store.ubigeoId
				? {
						value: store.ubigeoId,
						label: 'Distrito actual (sin cambios)',
					}
				: null,
			addressType: getAddressTypeOption(store.addressType),
			address: store.address,
			url: store.url,
		})
	}, [store])

	const isPhysical = values.type?.value === 'physical'

	const buildPayload = (): UpdateStoreActionInput | null => {
		if (!store) {
			return null
		}

		const selectedType = values.type?.value ?? store.type
		const isPhysicalType = selectedType === 'physical'

		return {
			id: store.id,
			slug: publicSlug.slug,
			name: values.name ?? store.name,
			type: selectedType,
			color: values.color ?? store.color,
			ubigeoId: isPhysicalType
				? (values.ubigeoOption?.value ?? store.ubigeoId ?? null)
				: null,
			addressType: isPhysicalType
				? (values.addressType?.value ?? store.addressType ?? null)
				: null,
			address: isPhysicalType
				? (values.address ?? store.address ?? null)
				: null,
			url: !isPhysicalType ? (values.url ?? store.url ?? null) : null,
		}
	}

	const handleSubmit = async () => {
		const payload = buildPayload()

		if (!payload) {
			return
		}

		const normalizedPayload = normalizeStoreMutationInput(payload)
		const validationError = validateStoreMutationInput(normalizedPayload)

		if (validationError) {
			sileo.error({
				title: 'Error al actualizar tienda',
				description: validationError,
			})

			return
		}

		if (!(await publicSlug.check())) {
			return
		}

		if (
			store &&
			publicSlug.slug !== store.slug &&
			!(await feedback.confirm({
				title: 'Cambiar URL de la tienda',
				description:
					'La URL anterior dejará de funcionar. Debes actualizar los enlaces compartidos y los QR generados anteriormente.',
				confirmText: 'Cambiar URL y guardar',
				cancelText: 'Cancelar',
			}))
		) {
			return
		}

		startTransition(async () => {
			const result = await updateStore(payload)

			if ('error' in result) {
				sileo.error({
					title: 'Error al actualizar tienda',
					description: result.error,
				})

				return
			}

			sileo.success({ title: 'Tienda actualizada' })
			onSuccess()
		})
	}

	const handleClose = () => {
		setValues(EMPTY_VALUES)
		onClose()
	}

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
			<DialogContent className='sm:max-w-lg'>
				<DialogHeader>
					<DialogTitle>Editar tienda</DialogTitle>
				</DialogHeader>

				<div className='space-y-4'>
					<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
						<TextField
							label='Nombre de la tienda'
							placeholder='Tienda Principal'
							value={values.name}
							onValueChange={(value) =>
								setValues((previous) => ({
									...previous,
									name: value,
								}))
							}
							disabled={isPending}
						/>
						<SelectField
							label='Tipo de tienda'
							placeholder='Selecciona...'
							options={STORE_TYPE_OPTIONS}
							value={values.type}
							onValueChange={(value) =>
								setValues((previous) => ({
									...previous,
									type: value,
								}))
							}
							disabled={isPending}
						/>
					</div>

					<PublicSlugField
						kind='store'
						slug={publicSlug.slug}
						onChange={publicSlug.setSlug}
						error={publicSlug.error}
						status={publicSlug.status}
						disabled={isPending}
						originalSlug={store?.slug}
					/>
					<StoreColorField
						value={values.color}
						onValueChange={(color) =>
							setValues((previous) => ({ ...previous, color }))
						}
						disabled={isPending}
					/>

					{values.type && (
						<>
							<Separator />

							{isPhysical ? (
								<div className='space-y-4'>
									<AutocompleteField
										label='Distrito'
										placeholder='Busca tu distrito...'
										searchPlaceholder='Escribe el nombre del distrito...'
										emptyMessage='No se encontraron distritos con ese nombre.'
										onSearch={searchUbigeos}
										value={values.ubigeoOption}
										onValueChange={(value) =>
											setValues((previous) => ({
												...previous,
												ubigeoOption: value,
											}))
										}
										disabled={isPending}
									/>
									<p className='text-xs text-muted-foreground'>
										Si no seleccionas un distrito nuevo, se
										conservará el actual.
									</p>
									<div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
										<SelectField
											label='Tipo de vía'
											placeholder='Selecciona...'
											options={ADDRESS_TYPE_OPTIONS}
											value={values.addressType}
											onValueChange={(value) =>
												setValues((previous) => ({
													...previous,
													addressType: value,
												}))
											}
											disabled={isPending}
										/>
										<div className='sm:col-span-2'>
											<TextField
												label='Dirección'
												placeholder='Av. Principal 123'
												value={values.address}
												onValueChange={(value) =>
													setValues((previous) => ({
														...previous,
														address: value,
													}))
												}
												disabled={isPending}
											/>
										</div>
									</div>
								</div>
							) : (
								<TextField
									label='URL de la tienda'
									placeholder='https://www.mitienda.com'
									type='url'
									value={values.url}
									onValueChange={(value) =>
										setValues((previous) => ({
											...previous,
											url: value,
										}))
									}
									disabled={isPending}
								/>
							)}
						</>
					)}
				</div>

				<DialogFooter>
					<Button
						variant='outline'
						onClick={handleClose}
						disabled={isPending}
					>
						Cancelar
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={
							isPending || publicSlug.status !== 'available'
						}
					>
						{isPending ? 'Guardando...' : 'Guardar'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
