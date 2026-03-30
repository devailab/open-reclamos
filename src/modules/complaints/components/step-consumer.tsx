'use client'

import { Phone } from 'lucide-react'
import type { FC } from 'react'
import AutocompleteField, {
	type AutocompleteOption,
} from '@/components/forms/autocomplete-field'
import BooleanField from '@/components/forms/boolean-field'
import ChoiceCardField from '@/components/forms/choice-card-field'
import type { ComboboxOption } from '@/components/forms/combobox-field'
import ComboboxField from '@/components/forms/combobox-field'
import SelectField, { type SelectOption } from '@/components/forms/select-field'
import TextField from '@/components/forms/text-field'
import { Separator } from '@/components/ui/separator'
import type { useForm } from '@/hooks/use-form'
import { DOCUMENT_TYPE_OPTIONS } from '@/lib/constants'
import { required } from '@/lib/validators'
import { $searchUbigeosAction } from '@/modules/setup/actions'
import { validateDocumentNumber, validateEmail } from '../validation'

export interface CountryOption {
	id: string
	name: string
	iso2: string
	phoneCode: string
}

export interface Step1Values {
	personType: 'natural' | 'juridical'
	// Natural + Juridical company doc (documentType = company doc for juridical, person doc for natural)
	documentType: SelectOption | null
	documentNumber: string | null
	// Natural person
	firstName: string | null
	lastName: string | null
	isMinor: boolean
	guardianDocumentType: SelectOption | null
	guardianDocumentNumber: string | null
	guardianFirstName: string | null
	guardianLastName: string | null
	// Juridical person
	legalName: string | null
	// Juridical contact person
	contactDocumentType: SelectOption | null
	contactDocumentNumber: string | null
	contactFirstName: string | null
	contactLastName: string | null
	// Contact info (shared)
	email: string | null
	dialCodeOption: ComboboxOption | null
	phone: string | null
	ubigeoOption: AutocompleteOption | null
	address: string | null
}

export const STEP1_INITIAL: Step1Values = {
	personType: 'natural',
	documentType: null,
	documentNumber: null,
	firstName: null,
	lastName: null,
	isMinor: false,
	guardianDocumentType: null,
	guardianDocumentNumber: null,
	guardianFirstName: null,
	guardianLastName: null,
	legalName: null,
	contactDocumentType: null,
	contactDocumentNumber: null,
	contactFirstName: null,
	contactLastName: null,
	email: null,
	dialCodeOption: null,
	phone: null,
	ubigeoOption: null,
	address: null,
}

const RUC_OPTION: SelectOption = { value: 'RUC', label: 'RUC' }

interface StepConsumerProps {
	register: ReturnType<typeof useForm<Step1Values>>['register']
	values: Step1Values
	countries: CountryOption[]
	disabled?: boolean
}

export const StepConsumer: FC<StepConsumerProps> = ({
	register,
	values,
	countries,
	disabled,
}) => {
	const phoneCodeOptions: ComboboxOption[] = countries.map((c) => ({
		value: c.iso2,
		label: `+${c.phoneCode} — ${c.name}`,
	}))

	const isNatural = values.personType === 'natural'
	const isJuridical = values.personType === 'juridical'

	return (
		<div className='space-y-6'>
			{/* Tipo de persona */}
			<div>
				<ChoiceCardField
					{...register('personType')}
					label='Tipo de persona'
					value={values.personType}
					options={[
						{
							value: 'natural',
							label: 'Persona natural',
							description: 'Para reclamos a título personal.',
						},
						{
							value: 'juridical',
							label: 'Persona jurídica',
							description: 'Para empresas o instituciones.',
						},
					]}
					disabled={disabled}
					columns={2}
				/>
			</div>

			{/* Datos de persona natural */}
			{isNatural && (
				<div className='space-y-4'>
					<p className='text-sm font-medium text-muted-foreground'>
						Datos personales
					</p>
					<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
						<SelectField
							{...register('documentType')}
							label='Tipo de documento *'
							placeholder='Selecciona...'
							options={DOCUMENT_TYPE_OPTIONS}
							validate={required}
							disabled={disabled}
						/>
						<TextField
							{...register('documentNumber')}
							label='Número de documento *'
							placeholder='12345678'
							validate={validateDocumentNumber}
							disabled={disabled}
						/>
					</div>
					<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
						<TextField
							{...register('firstName')}
							label='Nombres *'
							placeholder='Juan'
							validate={required}
							disabled={disabled}
						/>
						<TextField
							{...register('lastName')}
							label='Apellidos *'
							placeholder='Pérez García'
							validate={required}
							disabled={disabled}
						/>
					</div>

					<BooleanField
						{...register('isMinor')}
						label='Es menor de edad'
						description='El reclamante es menor de 18 años'
						variant='normal'
						disabled={disabled}
					/>

					{values.isMinor && (
						<div className='space-y-4 rounded-lg border bg-muted/30 p-4'>
							<p className='text-sm font-medium'>
								Datos del padre o tutor legal
							</p>
							<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
								<SelectField
									{...register('guardianDocumentType')}
									label='Tipo de documento *'
									placeholder='Selecciona...'
									options={DOCUMENT_TYPE_OPTIONS}
									validate={required}
									disabled={disabled}
								/>
								<TextField
									{...register('guardianDocumentNumber')}
									label='Número de documento *'
									placeholder='12345678'
									validate={validateDocumentNumber}
									disabled={disabled}
								/>
							</div>
							<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
								<TextField
									{...register('guardianFirstName')}
									label='Nombres *'
									placeholder='María'
									validate={required}
									disabled={disabled}
								/>
								<TextField
									{...register('guardianLastName')}
									label='Apellidos *'
									placeholder='López Torres'
									validate={required}
									disabled={disabled}
								/>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Datos de persona jurídica */}
			{isJuridical && (
				<div className='space-y-4'>
					<div className='space-y-4'>
						<p className='text-sm font-medium text-muted-foreground'>
							Datos de la empresa
						</p>
						<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
							<SelectField
								value={RUC_OPTION}
								onValueChange={() => {}}
								label='Tipo de documento'
								options={[RUC_OPTION]}
								disabled
							/>
							<TextField
								{...register('documentNumber')}
								label='RUC de la empresa *'
								placeholder='20552103816'
								validate={required}
								disabled={disabled}
							/>
						</div>
						<TextField
							{...register('legalName')}
							label='Razón social *'
							placeholder='Mi Empresa S.A.C.'
							validate={required}
							disabled={disabled}
						/>
					</div>

					<Separator />

					<div className='space-y-4'>
						<p className='text-sm font-medium text-muted-foreground'>
							Datos del representante o contacto
						</p>
						<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
							<SelectField
								{...register('contactDocumentType')}
								label='Tipo de documento *'
								placeholder='Selecciona...'
								options={DOCUMENT_TYPE_OPTIONS}
								validate={required}
								disabled={disabled}
							/>
							<TextField
								{...register('contactDocumentNumber')}
								label='Número de documento *'
								placeholder='12345678'
								validate={validateDocumentNumber}
								disabled={disabled}
							/>
						</div>
						<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
							<TextField
								{...register('contactFirstName')}
								label='Nombres *'
								placeholder='Juan'
								validate={required}
								disabled={disabled}
							/>
							<TextField
								{...register('contactLastName')}
								label='Apellidos *'
								placeholder='Pérez García'
								validate={required}
								disabled={disabled}
							/>
						</div>
					</div>
				</div>
			)}

			<Separator />

			{/* Datos de contacto */}
			<div className='space-y-4'>
				<p className='text-sm font-medium'>Datos de contacto</p>

				<TextField
					{...register('email')}
					label='Correo electrónico *'
					placeholder='correo@ejemplo.com'
					type='email'
					validate={validateEmail}
					disabled={disabled}
				/>

				<div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
					<ComboboxField
						{...register('dialCodeOption')}
						label='Código de país'
						placeholder='Selecciona...'
						searchPlaceholder='Buscar país...'
						options={phoneCodeOptions}
						disabled={disabled}
					/>
					<div className='sm:col-span-2'>
						<TextField
							{...register('phone')}
							label='Teléfono'
							placeholder='987 654 321'
							type='tel'
							disabled={disabled}
							prepend={
								values.dialCodeOption && (
									<Phone className='h-4 w-4 text-muted-foreground' />
								)
							}
						/>
					</div>
				</div>

				<AutocompleteField
					{...register('ubigeoOption')}
					label='Distrito'
					placeholder='Busca tu distrito...'
					searchPlaceholder='Escribe el nombre del distrito...'
					emptyMessage='No se encontraron distritos con ese nombre.'
					onSearch={$searchUbigeosAction}
					disabled={disabled}
				/>

				<TextField
					{...register('address')}
					label='Dirección'
					placeholder='Av. Principal 123'
					disabled={disabled}
				/>
			</div>
		</div>
	)
}
