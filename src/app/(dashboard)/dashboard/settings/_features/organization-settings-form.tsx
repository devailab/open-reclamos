'use client'

import {
	Bot,
	Building2,
	CalendarClock,
	FileText,
	Globe,
	Hash,
	Link,
	MapPin,
	Phone,
	Tag,
} from 'lucide-react'
import { useState, useTransition } from 'react'
import { sileo } from 'sileo'
import AutocompleteField, {
	type AutocompleteOption,
} from '@/components/forms/autocomplete-field'
import BooleanField from '@/components/forms/boolean-field'
import NumberField from '@/components/forms/number-field'
import SelectField, { type SelectOption } from '@/components/forms/select-field'
import TextField from '@/components/forms/text-field'
import TextAreaField from '@/components/forms/textarea-field'
import { PublicFormLink } from '@/components/public-form-link'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useForm } from '@/hooks/use-form'
import {
	ADDRESS_TYPE_OPTIONS,
	MAX_RESPONSE_DEADLINE_DAYS,
	MIN_RESPONSE_DEADLINE_DAYS,
} from '@/lib/constants'
import { required } from '@/lib/validators'
import { $updateOrganizationSettingsAction } from '@/modules/settings/actions'
import type { OrganizationSettings } from '@/modules/settings/queries'
import { $searchUbigeosAction } from '@/modules/setup/actions'

interface OrgFormValues {
	name: string | null
	legalName: string | null
	ubigeoOption: AutocompleteOption | null
	addressType: SelectOption | null
	address: string | null
	phoneCode: string | null
	phone: string | null
	website: string | null
	formEnabled: boolean
	aiClassificationEnabled: boolean
	aiOrganizationContext: string | null
	responseDeadlineDays: number | null
}

interface OrganizationSettingsFormProps {
	org: OrganizationSettings
	currentUbigeoOption: AutocompleteOption | null
	canManage: boolean
}

export function OrganizationSettingsForm({
	org,
	currentUbigeoOption,
	canManage,
}: OrganizationSettingsFormProps) {
	const getInitialAddressType = (): SelectOption | null => {
		return (
			ADDRESS_TYPE_OPTIONS.find((o) => o.value === org.addressType) ??
			null
		)
	}

	const initialValues: OrgFormValues = {
		name: org.name,
		legalName: org.legalName,
		ubigeoOption: currentUbigeoOption,
		addressType: getInitialAddressType(),
		address: org.address,
		phoneCode: org.phoneCode,
		phone: org.phone,
		website: org.website,
		formEnabled: org.formEnabled,
		aiClassificationEnabled: org.aiClassificationEnabled,
		aiOrganizationContext: org.aiOrganizationContext,
		responseDeadlineDays: org.responseDeadlineDays,
	}

	const [values, setValues] = useState<OrgFormValues>(initialValues)
	const [isPending, startTransition] = useTransition()
	const { register, validate } = useForm({
		values,
		setValues,
		initialValues,
	})

	const validateResponseDeadlineDays = (value: number | null) => {
		if (value === null) {
			return 'Debes indicar el plazo máximo de respuesta.'
		}
		if (value < MIN_RESPONSE_DEADLINE_DAYS) {
			return `El plazo mínimo es ${MIN_RESPONSE_DEADLINE_DAYS} día.`
		}
		if (value > MAX_RESPONSE_DEADLINE_DAYS) {
			return `El plazo máximo es ${MAX_RESPONSE_DEADLINE_DAYS} días.`
		}
		return null
	}

	const handleSubmit = () => {
		const errors = validate({ focus: 'first' })
		if (errors.length > 0) return

		startTransition(async () => {
			const result = await $updateOrganizationSettingsAction({
				name: values.name,
				legalName: values.legalName,
				ubigeoId: values.ubigeoOption?.value ?? null,
				addressType: values.addressType?.value ?? null,
				address: values.address,
				phoneCode: values.phoneCode,
				phone: values.phone,
				website: values.website,
				formEnabled: values.formEnabled,
				aiClassificationEnabled: values.aiClassificationEnabled,
				aiOrganizationContext: values.aiOrganizationContext,
				responseDeadlineDays: values.responseDeadlineDays,
			})

			if ('error' in result) {
				sileo.error({
					title: 'Error al guardar',
					description: result.error,
				})
				return
			}

			sileo.success({ title: 'Configuración guardada' })
		})
	}

	const disabled = isPending || !canManage

	return (
		<div className='space-y-6 max-w-3xl'>
			{!canManage && (
				<div className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
					Solo los administradores pueden editar la información de la
					organización.
				</div>
			)}

			{/* Información general */}
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2 text-base'>
						<Building2 className='size-4' />
						Información general
					</CardTitle>
					<CardDescription>
						Datos comerciales y legales de tu empresa.
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					{/* RUC y Slug — solo lectura */}
					<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
						<div className='space-y-1'>
							<p className='text-sm font-medium text-muted-foreground'>
								RUC
							</p>
							<div className='flex h-9 items-center gap-2 rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground'>
								<Hash className='size-3.5 shrink-0' />
								{org.taxId}
							</div>
						</div>
						<div className='space-y-1'>
							<p className='text-sm font-medium text-muted-foreground'>
								Identificador público
							</p>
							<div className='flex h-9 items-center gap-2 rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground'>
								<Tag className='size-3.5 shrink-0' />
								{org.slug}
							</div>
						</div>
					</div>

					<Separator />

					<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
						<TextField
							{...register('name')}
							label='Nombre comercial'
							placeholder='Ej. Mi Empresa S.A.C.'
							validate={required}
							prefix={<Building2 className='size-3.5' />}
							disabled={disabled}
						/>
						<TextField
							{...register('legalName')}
							label='Razón social'
							placeholder='Ej. MI EMPRESA SOCIEDAD ANONIMA CERRADA'
							validate={required}
							prefix={<FileText className='size-3.5' />}
							disabled={disabled}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Dirección */}
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2 text-base'>
						<MapPin className='size-4' />
						Dirección
					</CardTitle>
					<CardDescription>
						Ubicación física de tu empresa registrada en SUNAT.
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<AutocompleteField
						{...register('ubigeoOption')}
						label='Distrito'
						placeholder='Selecciona tu distrito'
						searchPlaceholder='Escribe el nombre del distrito...'
						emptyMessage='No se encontraron distritos con ese nombre.'
						onSearch={$searchUbigeosAction}
						validate={required}
						disabled={disabled}
					/>

					<div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
						<SelectField
							{...register('addressType')}
							label='Tipo de vía'
							placeholder='Selecciona...'
							options={ADDRESS_TYPE_OPTIONS}
							validate={required}
							disabled={disabled}
						/>
						<div className='sm:col-span-2'>
							<TextField
								{...register('address')}
								label='Dirección'
								placeholder='Ej. Av. Principal 123, Of. 201'
								validate={required}
								disabled={disabled}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Formulario de reclamos */}
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2 text-base'>
						<Link className='size-4' />
						Formulario de reclamos
					</CardTitle>
					<CardDescription>
						Controla la disponibilidad pública y el plazo de
						respuesta de toda la organización.
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<BooleanField
						{...register('formEnabled')}
						label='Formulario público habilitado'
						description='Si lo desactivas, ningún formulario de tus tiendas estará disponible públicamente.'
						disabled={disabled}
					/>

					<NumberField
						{...register('responseDeadlineDays')}
						label='Plazo máximo de respuesta'
						placeholder='15'
						prefix={<CalendarClock className='size-3.5' />}
						validate={validateResponseDeadlineDays}
						min={MIN_RESPONSE_DEADLINE_DAYS}
						max={MAX_RESPONSE_DEADLINE_DAYS}
						allowDecimals={false}
						allowNegative={false}
						suffix='días'
						disabled={disabled}
					/>

					{!values.formEnabled && (
						<div className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
							El formulario general y los formularios de todas las
							tiendas quedarán bloqueados públicamente hasta que
							lo vuelvas a activar.
						</div>
					)}

					<Separator />

					<PublicFormLink path={`/c/${org.slug}`} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2 text-base'>
						<Bot className='size-4' />
						Automatización IA
					</CardTitle>
					<CardDescription>
						Clasifica automáticamente la prioridad del reclamo y
						asigna hasta 3 tags según su contenido.
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<BooleanField
						{...register('aiClassificationEnabled')}
						label='Clasificación automática habilitada'
						description='La IA se ejecuta en segundo plano después de registrar el reclamo. Si falla, el reclamo sigue creado normalmente.'
						disabled={disabled}
					/>

					<TextAreaField
						{...register('aiOrganizationContext')}
						label='Contexto de la organización para la IA'
						placeholder='Ej. Somos una clínica privada, priorizamos casos de salud, menores de edad y posibles riesgos regulatorios.'
						rows={6}
						emptyAsNull
						disabled={disabled}
					/>

					<p className='text-sm text-muted-foreground'>
						Este contexto ayuda a la IA a entender mejor tu negocio,
						criterios de atención y señales que deberían influir en
						la clasificación.
					</p>

					{values.aiClassificationEnabled && (
						<div className='rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800'>
							Los nuevos reclamos se clasificarán automáticamente
							con prioridad operativa y tags sugeridos.
						</div>
					)}
				</CardContent>
			</Card>

			{/* Contacto */}
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2 text-base'>
						<Phone className='size-4' />
						Contacto
					</CardTitle>
					<CardDescription>
						Datos de contacto opcionales de tu empresa.
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
						<TextField
							{...register('phoneCode')}
							label='Código de país'
							placeholder='+51'
							emptyAsNull
							disabled={disabled}
						/>
						<div className='sm:col-span-2'>
							<TextField
								{...register('phone')}
								label='Teléfono'
								placeholder='987 654 321'
								type='tel'
								prefix={<Phone className='size-3.5' />}
								emptyAsNull
								disabled={disabled}
							/>
						</div>
					</div>

					<TextField
						{...register('website')}
						label='Sitio web'
						placeholder='https://www.miempresa.com'
						type='url'
						prefix={<Globe className='size-3.5' />}
						emptyAsNull
						disabled={disabled}
					/>
				</CardContent>
			</Card>

			{canManage && (
				<div className='flex justify-end'>
					<Button onClick={handleSubmit} disabled={isPending}>
						{isPending ? 'Guardando...' : 'Guardar cambios'}
					</Button>
				</div>
			)}
		</div>
	)
}
