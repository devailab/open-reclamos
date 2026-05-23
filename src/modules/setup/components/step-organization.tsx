'use client'

import { Phone, Search } from 'lucide-react'
import { useRef, useState, useTransition } from 'react'
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
	$setupOrganizationAction,
} from '@/modules/setup/actions'
import type { RucData } from '@/modules/setup/document-lookup'
import {
	validateAddress,
	validateAddressType,
	validateLegalName,
	validateOrgName,
	validateRuc,
	validateSlug,
} from '@/modules/setup/validation'

export interface SetupCountryData {
	id: string
	name: string
	iso2: string
	phoneCode: string
}

type StepOrganizationProps = {
	countries: SetupCountryData[]
}

type OrgFormValues = {
	name: string | null
	legalName: string | null
	slug: string | null
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

export function SetupStepOrganization({ countries }: StepOrganizationProps) {
	const [ruc, setRuc] = useState('')
	const [rucData, setRucData] = useState<RucData | null>(null)
	const [ubigeoId, setUbigeoId] = useState<string | null>(null)
	const [rucFound, setRucFound] = useState(false)
	const rucFieldRef = useRef<FormFieldRef>(null)

	const [isLookingUp, startLookupTransition] = useTransition()
	const [isPending, startTransition] = useTransition()

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
			setUbigeoId(null)
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
			setUbigeoId(result.ubigeoId)
			setRucFound(true)
			setValues((previous) => ({
				...previous,
				name: result.data.legalName,
				legalName: result.data.legalName,
				address: result.data.address,
				addressType: guessAddressType(result.data.address),
				slug,
			}))
		})
	}

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		if (!rucData || !ubigeoId) {
			feedback.alert.error({
				title: 'Primero busca el RUC de tu empresa',
			})
			return
		}

		const errors = validate({ focus: 'first' })
		if (errors.length > 0) return

		const confirmed = await feedback.confirm({
			title: '¿Crear esta organización?',
			description: `Se registrará "${values.name}" con RUC ${ruc}. Una vez creada no podrás modificar el RUC.`,
			confirmText: 'Sí, crear organización',
			cancelText: 'Revisar datos',
		})
		if (!confirmed) return

		startTransition(async () => {
			const selectedCountry = countries.find(
				(country) => country.iso2 === values.phoneCodeOption?.value,
			)

			const result = await $setupOrganizationAction({
				ruc,
				name: values.name ?? '',
				legalName: values.legalName ?? '',
				slug: values.slug ?? '',
				ubigeoId,
				addressType: values.addressType?.value ?? '',
				address: values.address ?? '',
				phoneCode: selectedCountry?.phoneCode ?? null,
				phone: values.phone ?? null,
				website: values.website ?? null,
			})

			if (result?.error) {
				feedback.alert.error({
					title: 'Error al guardar organización',
					description: result.error,
				})
			}
		})
	}

	const isLoading = isLookingUp || isPending

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
								disabled={isPending}
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
								disabled={isPending}
							/>
							<p className='text-xs text-muted-foreground'>
								Se usa en la URL de tu libro de reclamaciones.
								Solo letras minúsculas, números y guiones.
							</p>
						</div>

						<Separator />

						<div>
							<p className='mb-3 text-sm font-medium'>
								Dirección
							</p>
							<div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
								<SelectField
									{...register('addressType')}
									label='Tipo de vía'
									placeholder='Selecciona...'
									options={ADDRESS_TYPE_OPTIONS}
									validate={validateAddressType}
									disabled={isPending}
								/>
								<div className='sm:col-span-2'>
									<TextField
										{...register('address')}
										label='Dirección'
										placeholder='Av. Principal 123'
										validate={validateAddress}
										disabled={isPending}
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
										disabled={isPending}
									/>
									<div className='sm:col-span-2'>
										<TextField
											{...register('phone')}
											label='Teléfono'
											placeholder='987 654 321'
											type='tel'
											disabled={isPending}
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
									disabled={isPending}
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
					disabled={isPending}
				>
					{isPending ? (
						<>
							<Spinner className='mr-2' />
							Guardando...
						</>
					) : (
						'Continuar con la tienda →'
					)}
				</Button>
			)}
		</form>
	)
}
