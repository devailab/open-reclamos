import { Phone, Search } from 'lucide-react'
import { useRef, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import AutocompleteField, {
	type AutocompleteOption,
} from '@/shared/components/forms/autocomplete-field'
import ComboboxField, {
	type ComboboxOption,
} from '@/shared/components/forms/combobox-field'
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
import { Label } from '@/shared/components/ui/label'
import { Separator } from '@/shared/components/ui/separator'
import { Spinner } from '@/shared/components/ui/spinner'
import { usePublicConfig } from '@/shared/config/public-config'
import { ADDRESS_TYPE_OPTIONS } from '@/shared/constants/options'
import { type FormFieldRef, useForm } from '@/shared/hooks/use-form'
import { usePublicSlug } from '@/shared/hooks/use-public-slug'
import { useActionScope } from '../../../identity/hooks/use-action-scope'
import { errorMessage } from '../../../identity/validation'
import { guessAddressType } from '../../../integrations/api/ruc-lookup'
import {
	lookupOrganizationByRuc,
	type SetupOrganizationInput,
	searchUbigeos,
} from './api'
import {
	validateAddress,
	validateAddressType,
	validateLegalName,
	validateOrgName,
	validateRuc,
	validateUbigeo,
	validateWebsite,
} from './validation'

export interface SetupCountryData {
	id: string
	name: string
	iso2: string
	phoneCode: string
}

interface OrgFormValues {
	ruc: string | null
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
	ruc: null,
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

export function SetupStepOrganization({
	countries,
	onNext,
}: {
	countries: SetupCountryData[]
	onNext: (data: SetupOrganizationInput) => void
}) {
	const actions = useActionScope()
	const config = usePublicConfig()
	const [values, setValues] = useState(INITIAL_VALUES)
	const [rucFound, setRucFound] = useState(false)
	const rucFieldRef = useRef<FormFieldRef>(null)
	const lookupEnabled = config?.documentLookupEnabled === true
	const showDetails = !lookupEnabled || rucFound
	const [isLookingUp, startLookupTransition] = useTransition()
	const isBusy = isLookingUp
	const publicSlug = usePublicSlug({
		kind: 'organization',
		name: values.name ?? '',
		initialSlug: values.slug ?? '',
		enabled: showDetails,
	})

	const { register, validate } = useForm({
		values,
		setValues,
		initialValues: INITIAL_VALUES,
	})

	const phoneCodeOptions = countries.map((country) => ({
		value: country.iso2,
		label: `+${country.phoneCode} — ${country.name}`,
	}))

	const rucField = register('ruc')

	const handleRucLookup = () => {
		if (isBusy || !lookupEnabled || rucFieldRef.current?.validate()) {
			return
		}

		startLookupTransition(async () => {
			const signal = actions.begin()

			try {
				const data = await lookupOrganizationByRuc(
					values.ruc ?? '',
					signal,
				)

				signal.throwIfAborted()

				setValues((previous) => ({
					...previous,
					name: data.legalName,
					legalName: data.legalName,
					address: data.address,
					addressType: guessAddressType(data.address),
					ubigeoOption: data.ubigeo,
					slug: data.slug,
				}))

				setRucFound(true)
			} catch (error) {
				if (signal.aborted) {
					return
				}

				sileo.error({
					title: 'Error al consultar RUC',
					description: errorMessage(error),
				})
			}
		})
	}

	return (
		<form
			className='space-y-4'
			onSubmit={async (event) => {
				event.preventDefault()

				if (lookupEnabled && !rucFound) {
					handleRucLookup()

					return
				}

				if (validate({ focus: 'first' }).length) {
					return
				}
				if (isBusy) {
					return
				}

				if (!(await publicSlug.check())) {
					return
				}

				onNext({
					ruc: values.ruc ?? '',
					name: values.name ?? '',
					legalName: values.legalName ?? '',
					slug: publicSlug.slug,
					ubigeoId: values.ubigeoOption?.value ?? '',
					addressType: values.addressType?.value ?? '',
					address: values.address ?? '',
					phoneCode:
						countries.find(
							(country) =>
								country.iso2 === values.phoneCodeOption?.value,
						)?.phoneCode ?? null,
					phone: values.phone,
					website: values.website,
				})
			}}
		>
			<Card>
				<CardHeader className='pb-4'>
					<CardTitle className='text-base'>
						{lookupEnabled
							? 'Verificación de RUC'
							: 'RUC de la empresa'}
					</CardTitle>
					<CardDescription>
						{lookupEnabled
							? 'Busca tu empresa por RUC para autocompletar los datos'
							: 'Completa los datos de tu empresa. El RUC no podrá modificarse después del registro.'}
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='space-y-1'>
						<Label>RUC de la empresa</Label>
						<div className='flex items-start gap-2'>
							<TextField
								{...rucField}
								ref={(ref) => {
									rucField.ref(ref)
									rucFieldRef.current = ref
								}}
								onValueChange={(value) => {
									const ruc = (value ?? '')
										.replace(/\D/g, '')
										.slice(0, 11)

									setValues((previous) => ({
										...(rucFound
											? INITIAL_VALUES
											: previous),
										ruc,
									}))

									setRucFound(false)
								}}
								onKeyDown={(event) => {
									if (
										lookupEnabled &&
										event.key === 'Enter'
									) {
										event.preventDefault()
										handleRucLookup()
									}
								}}
								placeholder='20552103816'
								validate={validateRuc}
								disabled={isBusy}
							/>
							{lookupEnabled ? (
								<Button
									type='button'
									variant='outline'
									disabled={
										isBusy ||
										validateRuc(values.ruc) !== null
									}
									onClick={handleRucLookup}
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
							) : null}
						</div>
					</div>
				</CardContent>
			</Card>
			{showDetails ? (
				<>
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
									disabled={isBusy}
								/>
								<TextField
									{...register('legalName')}
									label='Razón social'
									validate={validateLegalName}
									disabled={lookupEnabled || isBusy}
								/>
							</div>
							<PublicSlugField
								kind='organization'
								slug={publicSlug.slug}
								onChange={publicSlug.setSlug}
								error={publicSlug.error}
								status={publicSlug.status}
								disabled={isBusy}
							/>
							<Separator />
							<div className='space-y-4'>
								<p className='text-sm font-medium'>Dirección</p>
								<AutocompleteField
									{...register('ubigeoOption')}
									label='Distrito'
									placeholder='Busca tu distrito...'
									searchPlaceholder='Escribe el nombre del distrito...'
									emptyMessage='No se encontraron distritos con ese nombre.'
									onSearch={searchUbigeos}
									validate={validateUbigeo}
									disabled={isBusy}
								/>
								<div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
									<SelectField
										{...register('addressType')}
										label='Tipo de vía'
										placeholder='Selecciona...'
										options={ADDRESS_TYPE_OPTIONS}
										validate={validateAddressType}
										disabled={isBusy}
									/>
									<div className='sm:col-span-2'>
										<TextField
											{...register('address')}
											label='Dirección'
											placeholder='Av. Principal 123'
											validate={validateAddress}
											disabled={isBusy}
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
											disabled={isBusy}
										/>
										<div className='sm:col-span-2'>
											<TextField
												{...register('phone')}
												label='Teléfono'
												placeholder='987 654 321'
												type='tel'
												prepend={
													values.phoneCodeOption ? (
														<Phone className='h-4 w-4 text-muted-foreground' />
													) : undefined
												}
												disabled={isBusy}
											/>
										</div>
									</div>
									<TextField
										{...register('website')}
										label='Sitio web'
										placeholder='https://www.mi-empresa.com'
										type='url'
										validate={validateWebsite}
										disabled={isBusy}
									/>
								</div>
							</div>
						</CardContent>
					</Card>
					<Button
						type='submit'
						className='w-full'
						size='lg'
						disabled={isBusy || publicSlug.status !== 'available'}
					>
						Continuar con la tienda →
					</Button>
				</>
			) : null}
		</form>
	)
}
