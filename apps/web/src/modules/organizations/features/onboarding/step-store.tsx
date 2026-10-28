import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
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
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/shared/components/ui/card'
import { Separator } from '@/shared/components/ui/separator'
import { Spinner } from '@/shared/components/ui/spinner'
import {
	ADDRESS_TYPE_OPTIONS,
	STORE_TYPE_OPTIONS,
} from '@/shared/constants/options'
import { useForm } from '@/shared/hooks/use-form'
import { usePublicSlug } from '@/shared/hooks/use-public-slug'
import { type SetupStoreInput, searchUbigeos } from './api'
import { DEFAULT_STORE_COLOR } from './constants'
import { StoreColorField } from './store-color-field'
import {
	validateStoreAddress,
	validateStoreAddressType,
	validateStoreColor,
	validateStoreName,
	validateStoreType,
	validateStoreUbigeo,
	validateWebsite,
} from './validation'

type StoreFormValues = {
	name: string | null
	type: SelectOption | null
	color: string
	ubigeoOption: AutocompleteOption | null
	addressType: SelectOption | null
	address: string | null
	url: string | null
}

const INITIAL_VALUES: StoreFormValues = {
	name: null,
	type: null,
	color: DEFAULT_STORE_COLOR,
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
	const publicSlug = usePublicSlug({ kind: 'store', name: values.name ?? '' })

	const { register, validate } = useForm({
		values,
		setValues,
		initialValues: INITIAL_VALUES,
	})

	const isPhysical = values.type?.value === 'physical'

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		const errors = validate({ focus: 'first' })

		if (errors.length > 0) {
			return
		}

		if (!(await publicSlug.check())) {
			return
		}

		onSubmit({
			name: values.name ?? '',
			slug: publicSlug.slug,
			type: values.type?.value ?? '',
			color: values.color,
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

					<PublicSlugField
						kind='store'
						slug={publicSlug.slug}
						onChange={publicSlug.setSlug}
						error={publicSlug.error}
						status={publicSlug.status}
						disabled={isPending}
					/>

					<StoreColorField
						{...register('color')}
						validate={validateStoreColor}
						disabled={isPending}
					/>

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
										onSearch={searchUbigeos}
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
										validate={validateWebsite}
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
					disabled={
						isPending ||
						!values.type ||
						publicSlug.status !== 'available'
					}
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
