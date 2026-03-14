'use client'

import { useState, useTransition } from 'react'
import { sileo } from 'sileo'
import AutocompleteField, {
	type AutocompleteOption,
} from '@/components/forms/autocomplete-field'
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
import { Separator } from '@/components/ui/separator'
import { ADDRESS_TYPE_OPTIONS, STORE_TYPE_OPTIONS } from '@/lib/constants'
import { $searchUbigeosAction } from '@/modules/setup/actions'
import { $createStoreAction } from '@/modules/stores/actions'
import {
	normalizeStoreMutationInput,
	type StoreMutationInput,
	validateStoreMutationInput,
} from '@/modules/stores/validation'

interface CreateStoreDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onSuccess: () => void
}

interface StoreFormValues {
	name: string | null
	type: SelectOption | null
	ubigeoOption: AutocompleteOption | null
	addressType: SelectOption | null
	address: string | null
	url: string | null
}

const INITIAL_VALUES: StoreFormValues = {
	name: null,
	type: null,
	ubigeoOption: null,
	addressType: null,
	address: null,
	url: null,
}

export function CreateStoreDialog({
	open,
	onOpenChange,
	onSuccess,
}: CreateStoreDialogProps) {
	const [values, setValues] = useState<StoreFormValues>(INITIAL_VALUES)
	const [isPending, startTransition] = useTransition()

	const isPhysical = values.type?.value === 'physical'

	const resetForm = () => {
		setValues(INITIAL_VALUES)
	}

	const buildPayload = (): StoreMutationInput => {
		return {
			name: values.name ?? '',
			type: values.type?.value ?? '',
			ubigeoId: isPhysical ? (values.ubigeoOption?.value ?? null) : null,
			addressType: isPhysical
				? (values.addressType?.value ?? null)
				: null,
			address: isPhysical ? (values.address ?? null) : null,
			url: !isPhysical ? (values.url ?? null) : null,
		}
	}

	const handleSubmit = () => {
		const payload = buildPayload()
		const normalizedPayload = normalizeStoreMutationInput(payload)
		const validationError = validateStoreMutationInput(normalizedPayload)
		if (validationError) {
			sileo.error({
				title: 'Error al crear tienda',
				description: validationError,
			})
			return
		}

		startTransition(async () => {
			const result = await $createStoreAction(payload)

			if ('error' in result) {
				sileo.error({
					title: 'Error al crear tienda',
					description: result.error,
				})
				return
			}

			sileo.success({ title: 'Tienda creada' })
			resetForm()
			onSuccess()
		})
	}

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) resetForm()
		onOpenChange(isOpen)
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className='sm:max-w-lg'>
				<DialogHeader>
					<DialogTitle>Nueva tienda</DialogTitle>
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
										onSearch={$searchUbigeosAction}
										value={values.ubigeoOption}
										onValueChange={(value) =>
											setValues((previous) => ({
												...previous,
												ubigeoOption: value,
											}))
										}
										disabled={isPending}
									/>
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
						onClick={() => handleOpenChange(false)}
						disabled={isPending}
					>
						Cancelar
					</Button>
					<Button onClick={handleSubmit} disabled={isPending}>
						{isPending ? 'Guardando...' : 'Guardar'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
