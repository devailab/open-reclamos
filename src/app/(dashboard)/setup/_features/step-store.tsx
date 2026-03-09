'use client'

import { useState, useTransition } from 'react'
import AutocompleteField, {
	type AutocompleteOption,
} from '@/components/forms/autocomplete-field'
import SelectField, { type SelectOption } from '@/components/forms/select-field'
import TextField from '@/components/forms/text-field'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { useForm } from '@/hooks/use-form'
import { ADDRESS_TYPE_OPTIONS, STORE_TYPE_OPTIONS } from '@/lib/constants'
import { feedback } from '@/lib/feedback'
import {
	$searchUbigeosAction,
	$setupStoreAction,
} from '@/modules/setup/actions'
import {
	validateStoreAddress,
	validateStoreAddressType,
	validateStoreName,
	validateStoreType,
	validateStoreUbigeo,
} from '@/modules/setup/validation'

type StepStoreProps = {
	organizationId: string
}

type StoreFormValues = {
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

export function StepStore({ organizationId }: StepStoreProps) {
	const [isPending, startTransition] = useTransition()

	const [values, setValues] = useState<StoreFormValues>(INITIAL_VALUES)
	const { register, validate } = useForm({
		values,
		setValues,
		initialValues: INITIAL_VALUES,
	})

	const isPhysical = values.type?.value === 'physical'

	const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault()

		const errors = validate({ focus: 'first' })
		if (errors.length > 0) return

		startTransition(async () => {
			const result = await $setupStoreAction({
				organizationId,
				name: values.name ?? '',
				type: values.type?.value ?? '',
				ubigeoId: isPhysical
					? (values.ubigeoOption?.value ?? null)
					: null,
				addressType: isPhysical
					? (values.addressType?.value ?? null)
					: null,
				address: isPhysical ? (values.address ?? null) : null,
				url: !isPhysical ? (values.url ?? null) : null,
			})

			if (result?.error) {
				feedback.alert.error({
					title: 'Error al guardar tienda',
					description: result.error,
				})
			}
		})
	}

	return (
		<form onSubmit={handleSubmit} className='space-y-4'>
			<Card>
				<CardHeader className='pb-4'>
					<CardTitle className='text-base'>
						Datos de la tienda
					</CardTitle>
					<CardDescription>
						Agrega tu primera tienda o punto de venta
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-5'>
					{/* Nombre y tipo */}
					<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
						<TextField
							{...register('name')}
							label='Nombre de la tienda'
							placeholder='Tienda Principal'
							validate={validateStoreName}
							disabled={isPending}
						/>
						<SelectField
							{...register('type')}
							label='Tipo de tienda'
							placeholder='Selecciona...'
							options={STORE_TYPE_OPTIONS}
							validate={validateStoreType}
							disabled={isPending}
						/>
					</div>

					{/* Campos condicionales según el tipo */}
					{values.type && (
						<>
							<Separator />

							{isPhysical ? (
								<div className='space-y-4'>
									<p className='text-sm font-medium'>
										Ubicación de la tienda
									</p>
									<AutocompleteField
										{...register('ubigeoOption')}
										label='Distrito'
										placeholder='Busca tu distrito...'
										searchPlaceholder='Escribe el nombre del distrito...'
										emptyMessage='No se encontraron distritos con ese nombre.'
										onSearch={$searchUbigeosAction}
										validate={validateStoreUbigeo}
										disabled={isPending}
									/>
									<div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
										<SelectField
											{...register('addressType')}
											label='Tipo de vía'
											placeholder='Selecciona...'
											options={ADDRESS_TYPE_OPTIONS}
											validate={validateStoreAddressType}
											disabled={isPending}
										/>
										<div className='sm:col-span-2'>
											<TextField
												{...register('address')}
												label='Dirección'
												placeholder='Av. Principal 123'
												validate={validateStoreAddress}
												disabled={isPending}
											/>
										</div>
									</div>
								</div>
							) : (
								<div className='space-y-1'>
									<TextField
										{...register('url')}
										label='URL de la tienda'
										placeholder='https://www.mitienda.com'
										type='url'
										disabled={isPending}
									/>
									<p className='text-xs text-muted-foreground'>
										URL de tu tienda o plataforma de ventas
										en línea (opcional)
									</p>
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>

			<Button
				type='submit'
				className='w-full'
				size='lg'
				disabled={isPending || !values.type}
			>
				{isPending ? (
					<>
						<Spinner className='mr-2' />
						Guardando...
					</>
				) : (
					'Completar registro'
				)}
			</Button>
		</form>
	)
}
