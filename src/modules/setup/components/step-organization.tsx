'use client'

import { Phone, Search } from 'lucide-react'
import { useRef, useState, useTransition } from 'react'
import AutocompleteField, {
	type AutocompleteOption,
} from '@/components/forms/autocomplete-field'
import ComboboxField, {
	type ComboboxOption,
} from '@/components/forms/combobox-field'
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
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { type FormFieldRef, useForm } from '@/hooks/use-form'
import { ADDRESS_TYPE_OPTIONS } from '@/lib/constants'
import { feedback } from '@/lib/feedback'
import {
	$getSlugSuggestionAction,
	$lookupRucAction,
	$searchUbigeosAction,
	type SetupOrganizationInput,
} from '@/modules/setup/actions'
import type { RucData } from '@/modules/setup/document-lookup'
import {
	validateAddress,
	validateAddressType,
	validateLegalName,
	validateOrgName,
	validateRuc,
	validateSlug,
	validateUbigeo,
} from '@/modules/setup/validation'

export interface SetupCountryData {
	id: string
	name: string
	iso2: string
	phoneCode: string
}

type StepOrganizationProps = {
	countries: SetupCountryData[]
	onNext: (data: SetupOrganizationInput) => void
}

type OrgFormValues = {
	name: string | null
	legalName: string | null
	slug: string | null
	ubigeoOption: AutocompleteOption | null
	addressType: SelectOption | null
	address: string | null
	phoneCodeOption: ComboboxOption | null
	phone: string | null
	website: string | null
}

const INITIAL_VALUES: OrgFormValues = {
	name: null,
	legalName: null,
	slug: null,
	ubigeoOption: null,
	addressType: null,
	address: null,
	phoneCodeOption: null,
	phone: null,
	website: null,
}

function guessAddressType(address: string): SelectOption | null {
	const normalized = address.toUpperCase()
	const candidates: Array<[string[], string]> = [
		[['AV.', 'AVE.', 'AVENIDA'], 'AVENIDA'],
		[['JR.', 'JR ', 'JIRON', 'JIRÓN'], 'JIRON'],
		[['PJE.', 'PJ.', 'PSJE.', 'PASAJE'], 'PASAJE'],
		[['CARR.', 'CAR.', 'CARRETERA'], 'CARRETERA'],
		[['ESQ.', 'ESQUINA'], 'ESQUINA'],
		[['CAL.', 'CALLE', 'CLL.', 'CL.'], 'CALLE'],
		[['URB.', 'URBANIZACION', 'URBANIZACIÓN'], 'URBANIZACION'],
		[['PROL.', 'PROLONGACION', 'PROLONGACIÓN'], 'PROLONGACION'],
	]

	for (const [prefixes, value] of candidates) {
		if (prefixes.some((prefix) => normalized.startsWith(prefix))) {
			return (
				ADDRESS_TYPE_OPTIONS.find((option) => option.value === value) ??
				null
			)
		}
	}

	return null
}

export function SetupStepOrganization({
	countries,
	onNext,
}: StepOrganizationProps) {
	const [ruc, setRuc] = useState('')
	const [rucData, setRucData] = useState<RucData | null>(null)
	const [rucFound, setRucFound] = useState(false)
	const rucFieldRef = useRef<FormFieldRef>(null)

	const [isLookingUp, startLookupTransition] = useTransition()

	const [values, setValues] = useState<OrgFormValues>(INITIAL_VALUES)
	const { register, validate } = useForm({
		values,
		setValues,
		initialValues: INITIAL_VALUES,
	})

	const phoneCodeOptions: ComboboxOption[] = countries.map((country) => ({
		value: country.iso2,
		label: `+${country.phoneCode} — ${country.name}`,
	}))

	const handleRucChange = (value: string | null) => {
		const cleaned = (value ?? '').replace(/\D/g, '').slice(0, 11)
		setRuc(cleaned)
		if (rucFound) {
			setRucFound(false)
			setRucData(null)
			setValues(INITIAL_VALUES)
		}
	}

	const handleRucLookup = () => {
		const error = rucFieldRef.current?.validate()
		if (error) return

		startLookupTransition(async () => {
			const result = await $lookupRucAction(ruc)

			if (!result.success) {
				feedback.alert.error({
					title: 'Error al consultar RUC',
					description: result.error,
				})
				return
			}

			const slug = await $getSlugSuggestionAction(result.data.legalName)

			setRucData(result.data)
			setRucFound(true)
			setValues((previous) => ({
				...previous,
				name: result.data.legalName,
				legalName: result.data.legalName,
				ubigeoOption: result.ubigeo,
				address: result.data.address,
				addressType: guessAddressType(result.data.address),
				slug,
			}))
		})
	}

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		if (!rucData) {
			feedback.alert.error({
				title: 'Primero busca el RUC de tu empresa',
			})
			return
		}

		const errors = validate({ focus: 'first' })
		if (errors.length > 0) return

		const selectedCountry = countries.find(
			(country) => country.iso2 === values.phoneCodeOption?.value,
		)

		onNext({
			ruc,
			name: values.name ?? '',
			legalName: values.legalName ?? '',
			slug: values.slug ?? '',
			ubigeoId: values.ubigeoOption?.value ?? '',
			addressType: values.addressType?.value ?? '',
			address: values.address ?? '',
			phoneCode: selectedCountry?.phoneCode ?? null,
			phone: values.phone ?? null,
			website: values.website ?? null,
		})
	}

	const isLoading = isLookingUp

	return (
		<form onSubmit={handleSubmit} className='space-y-4'>
			<Card>
				<CardHeader className='pb-4'>
					<CardTitle className='text-base'>
						Verificación de RUC
					</CardTitle>
					<CardDescription>
						Busca tu empresa por RUC para autocompletar los datos
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='space-y-1'>
						<Label>RUC de la empresa</Label>
						<div className='flex items-start gap-2'>
							<TextField
								ref={rucFieldRef}
								value={ruc}
								onValueChange={handleRucChange}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault()
										handleRucLookup()
									}
								}}
								validate={validateRuc}
								placeholder='20552103816'
								disabled={isLoading}
							/>
							<Button
								type='button'
								variant='outline'
								onClick={handleRucLookup}
								disabled={isLoading || ruc.length !== 11}
								className='shrink-0'
							>
								{isLookingUp ? (
									<Spinner />
								) : (
									<Search className='h-4 w-4' />
								)}
								<span className='ml-1.5'>
									{isLookingUp ? 'Buscando...' : 'Buscar'}
								</span>
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{rucFound && (
				<Card>
					<CardHeader className='pb-4'>
						<CardTitle className='text-base'>
							Datos de la organización
						</CardTitle>
						<CardDescription>
							Revisa y completa la información de tu empresa
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-5'>
						<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
							<TextField
								{...register('name')}
								label='Nombre comercial'
								placeholder='Mi Empresa S.A.C.'
								validate={validateOrgName}
								disabled={isLookingUp}
							/>
							<TextField
								{...register('legalName')}
								label='Razón social'
								disabled
								validate={validateLegalName}
							/>
						</div>

						<div className='space-y-1'>
							<TextField
								{...register('slug')}
								label='Identificador único'
								placeholder='mi-empresa'
								validate={validateSlug}
								disabled={isLookingUp}
							/>
							<p className='text-xs text-muted-foreground'>
								Se usa en la URL de tu libro de reclamaciones.
								Solo letras minúsculas, números y guiones.
							</p>
						</div>

						<Separator />

						<div className='space-y-4'>
							<p className='text-sm font-medium'>Dirección</p>
							<AutocompleteField
								{...register('ubigeoOption')}
								label='Distrito'
								placeholder='Busca tu distrito...'
								searchPlaceholder='Escribe el nombre del distrito...'
								emptyMessage='No se encontraron distritos con ese nombre.'
								onSearch={$searchUbigeosAction}
								validate={validateUbigeo}
								disabled={isLookingUp}
							/>
							<div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
								<SelectField
									{...register('addressType')}
									label='Tipo de vía'
									placeholder='Selecciona...'
									options={ADDRESS_TYPE_OPTIONS}
									validate={validateAddressType}
									disabled={isLookingUp}
								/>
								<div className='sm:col-span-2'>
									<TextField
										{...register('address')}
										label='Dirección'
										placeholder='Av. Principal 123'
										validate={validateAddress}
										disabled={isLookingUp}
									/>
								</div>
							</div>
						</div>

						<Separator />

						<div>
							<p className='mb-1 text-sm font-medium'>
								Contacto{' '}
								<span className='font-normal text-muted-foreground'>
									(opcional)
								</span>
							</p>
							<p className='mb-3 text-xs text-muted-foreground'>
								Datos de contacto visibles en el libro de
								reclamaciones
							</p>
							<div className='space-y-4'>
								<div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
									<ComboboxField
										{...register('phoneCodeOption')}
										label='Código de país'
										placeholder='Selecciona...'
										searchPlaceholder='Buscar país...'
										options={phoneCodeOptions}
										disabled={isLookingUp}
									/>
									<div className='sm:col-span-2'>
										<TextField
											{...register('phone')}
											label='Teléfono'
											placeholder='987 654 321'
											type='tel'
											disabled={isLookingUp}
											prepend={
												values.phoneCodeOption ? (
													<Phone className='h-4 w-4 text-muted-foreground' />
												) : undefined
											}
										/>
									</div>
								</div>
								<TextField
									{...register('website')}
									label='Sitio web'
									placeholder='https://www.mi-empresa.com'
									type='url'
									disabled={isLookingUp}
								/>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{rucFound && (
				<Button
					type='submit'
					className='w-full'
					size='lg'
					disabled={isLookingUp}
				>
					Continuar con la tienda →
				</Button>
			)}
		</form>
	)
}
