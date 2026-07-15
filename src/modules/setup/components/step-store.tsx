'use client'

import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
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
import {
	$searchUbigeosAction,
	type SetupStoreInput,
} from '@/modules/setup/actions'
import {
	validateStoreAddress,
	validateStoreAddressType,
	validateStoreName,
	validateStoreType,
	validateStoreUbigeo,
} from '@/modules/setup/validation'

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

type SetupStepStoreProps = {
	organizationName?: string
	onSubmit: (data: SetupStoreInput) => void
	onBack?: () => void
	isPending: boolean
}

export function SetupStepStore({
	organizationName,
	onSubmit,
	onBack,
	isPending,
}: SetupStepStoreProps) {
	const [values, setValues] = useState<StoreFormValues>(INITIAL_VALUES)
	const { register, validate } = useForm({
		values,
		setValues,
		initialValues: INITIAL_VALUES,
	})

	const isPhysical = values.type?.value === 'physical'

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		const errors = validate({ focus: 'first' })
		if (errors.length > 0) return

		onSubmit({
			name: values.name ?? '',
			type: values.type?.value ?? '',
			ubigeoId: isPhysical ? (values.ubigeoOption?.value ?? null) : null,
			addressType: isPhysical
				? (values.addressType?.value ?? null)
				: null,
			address: isPhysical ? (values.address ?? null) : null,
			url: !isPhysical ? (values.url ?? null) : null,
		})
	}

	return (
		<form onSubmit={handleSubmit} className='space-y-4'>
			{organizationName && (
				<div className='flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3 text-sm'>
					<span className='text-muted-foreground'>
						Completando configuración para
					</span>
					<span className='font-medium text-foreground'>
						{organizationName}
					</span>
				</div>
			)}
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

			<div className='flex flex-col gap-2 sm:flex-row'>
				{onBack && (
					<Button
						type='button'
						variant='outline'
						size='lg'
						className='sm:w-auto'
						disabled={isPending}
						onClick={onBack}
					>
						<ArrowLeft className='mr-1.5 h-4 w-4' />
						Volver a la organización
					</Button>
				)}
				<Button
					type='submit'
					className='flex-1'
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
			</div>
		</form>
	)
}
