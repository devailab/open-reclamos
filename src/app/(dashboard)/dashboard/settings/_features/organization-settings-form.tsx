'use client'

import {
	Bot,
	Building2,
	CalendarClock,
	Check,
	Copy,
	FileText,
	Globe,
	Hash,
	Link,
	MapPin,
	Phone,
	Zap,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import AutocompleteField, {
	type AutocompleteOption,
} from '@/components/forms/autocomplete-field'
import BooleanField from '@/components/forms/boolean-field'
import NumberField from '@/components/forms/number-field'
import SelectField, { type SelectOption } from '@/components/forms/select-field'
import TextField from '@/components/forms/text-field'
import TextAreaField from '@/components/forms/textarea-field'
import { OrganizationLogo } from '@/components/organization-logo'
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
	MCP_TOOL_LABELS,
	MCP_TOOLS,
	MIN_RESPONSE_DEADLINE_DAYS,
} from '@/lib/constants'
import { required } from '@/lib/validators'
import {
	$removeOrganizationLogoAction,
	$updateOrganizationSettingsAction,
} from '@/modules/settings/actions'
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
	mcpShowSensitiveData: boolean
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
	const router = useRouter()
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
		mcpShowSensitiveData: org.mcpShowSensitiveData,
	}

	const ALL_TOOL_NAMES = Object.values(MCP_TOOLS)

	const getInitialEnabledTools = (): string[] => {
		if (!org.mcpEnabledTools) return ALL_TOOL_NAMES
		const saved = org.mcpEnabledTools
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean)
		return ALL_TOOL_NAMES.filter((t) => saved.includes(t))
	}

	const [values, setValues] = useState<OrgFormValues>(initialValues)
	const [mcpEnabledTools, setMcpEnabledTools] = useState<string[]>(
		getInitialEnabledTools,
	)
	const [copied, setCopied] = useState(false)
	const [logoKey, setLogoKey] = useState(org.logoKey)
	const [logoVersion, setLogoVersion] = useState(0)
	const [isPending, startTransition] = useTransition()
	const [isUploadingLogo, startUploadTransition] = useTransition()
	const [isRemovingLogo, startRemoveLogoTransition] = useTransition()
	const logoInputRef = useRef<HTMLInputElement>(null)
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

	const handleLogoUpload = (file: File | null) => {
		if (!file) return

		startUploadTransition(async () => {
			try {
				const formData = new FormData()
				formData.append('file', file)

				const response = await fetch('/api/organizations/logo', {
					method: 'POST',
					body: formData,
				})
				const payload = await response.json()

				if (!response.ok) {
					sileo.error({
						title: 'No se pudo subir el logo',
						description:
							payload.error ??
							'Inténtalo nuevamente en unos segundos.',
					})
					return
				}

				setLogoKey(payload.logoKey ?? 'uploaded')
				setLogoVersion((current) => current + 1)
				router.refresh()
				sileo.success({ title: 'Logo actualizado' })
			} catch {
				sileo.error({
					title: 'No se pudo subir el logo',
					description: 'Inténtalo nuevamente en unos segundos.',
				})
			} finally {
				if (logoInputRef.current) {
					logoInputRef.current.value = ''
				}
			}
		})
	}

	const handleRemoveLogo = () => {
		startRemoveLogoTransition(async () => {
			const result = await $removeOrganizationLogoAction()
			if ('error' in result) {
				sileo.error({
					title: 'No se pudo quitar el logo',
					description: result.error,
				})
				return
			}

			setLogoKey(null)
			setLogoVersion((current) => current + 1)
			router.refresh()
			sileo.success({ title: 'Logo eliminado' })
		})
	}

	const handleSubmit = () => {
		const errors = validate({ focus: 'first' })
		if (errors.length > 0) return

		startTransition(async () => {
			const allEnabled = mcpEnabledTools.length === ALL_TOOL_NAMES.length
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
				mcpEnabledTools: allEnabled ? null : mcpEnabledTools.join(','),
				mcpShowSensitiveData: values.mcpShowSensitiveData,
			})

			if ('error' in result) {
				sileo.error({
					title: 'Error al guardar',
					description: result.error,
				})
				return
			}

			router.refresh()
			sileo.success({ title: 'Configuración guardada' })
		})
	}

	const handleCopyMcpUrl = () => {
		const url = `${window.location.origin}/api/mcp/mcp?key=[aqui-tu-api-key]`
		navigator.clipboard.writeText(url).then(() => {
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
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

			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2 text-base'>
						<Building2 className='size-4' />
						Identidad visual
					</CardTitle>
					<CardDescription>
						Sube el logo de tu organización. Recomendado: PNG, JPG o
						WebP en formato cuadrado de 512x512 px y máximo 2 MB.
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
						<OrganizationLogo
							organizationId={org.id}
							logoKey={logoKey}
							name={org.name}
							cacheKey={logoVersion}
							className='size-20 rounded-2xl'
						/>
						<div className='space-y-3'>
							<div>
								<p className='text-sm font-medium'>
									Logo de la organización
								</p>
								<p className='text-xs text-muted-foreground'>
									Si no subes uno, usaremos el logo por
									defecto de Open Reclamos en el sidebar.
								</p>
							</div>
							<div className='flex flex-wrap gap-2'>
								<Button
									type='button'
									variant='outline'
									disabled={
										disabled ||
										isUploadingLogo ||
										isRemovingLogo
									}
									onClick={() =>
										logoInputRef.current?.click()
									}
								>
									{isUploadingLogo
										? 'Subiendo...'
										: 'Subir logo'}
								</Button>
								<Button
									type='button'
									variant='ghost'
									disabled={
										disabled ||
										!logoKey ||
										isUploadingLogo ||
										isRemovingLogo
									}
									onClick={handleRemoveLogo}
								>
									{isRemovingLogo
										? 'Quitando...'
										: 'Quitar logo'}
								</Button>
								<input
									ref={logoInputRef}
									type='file'
									accept='image/png,image/jpeg,image/webp'
									className='hidden'
									disabled={disabled || isUploadingLogo}
									onChange={(event) =>
										handleLogoUpload(
											event.target.files?.[0] ?? null,
										)
									}
								/>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

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
								<Link className='size-3.5 shrink-0' />
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
						sugiere un resumen interno y una categoría según su
						contenido.
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
							con prioridad operativa y categoría sugerida.
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

			<McpSettingsCard
				disabled={disabled}
				mcpEnabledTools={mcpEnabledTools}
				setMcpEnabledTools={setMcpEnabledTools}
				mcpShowSensitiveData={values.mcpShowSensitiveData}
				onShowSensitiveDataChange={(v) =>
					setValues((prev) => ({ ...prev, mcpShowSensitiveData: v }))
				}
				copied={copied}
				onCopy={handleCopyMcpUrl}
			/>

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

interface McpSettingsCardProps {
	disabled: boolean
	mcpEnabledTools: string[]
	setMcpEnabledTools: (tools: string[]) => void
	mcpShowSensitiveData: boolean
	onShowSensitiveDataChange: (value: boolean) => void
	copied: boolean
	onCopy: () => void
}

function McpSettingsCard({
	disabled,
	mcpEnabledTools,
	setMcpEnabledTools,
	mcpShowSensitiveData,
	onShowSensitiveDataChange,
	copied,
	onCopy,
}: McpSettingsCardProps) {
	const ALL_TOOL_NAMES = Object.values(MCP_TOOLS)

	const toggleTool = (toolName: string) => {
		if (mcpEnabledTools.includes(toolName)) {
			setMcpEnabledTools(mcpEnabledTools.filter((t) => t !== toolName))
		} else {
			setMcpEnabledTools([...mcpEnabledTools, toolName])
		}
	}

	const mcpUrl =
		typeof window !== 'undefined'
			? `${window.location.origin}/api/mcp/mcp?key=[aqui-tu-api-key]`
			: '/api/mcp/mcp?key=[aqui-tu-api-key]'

	return (
		<Card>
			<CardHeader>
				<CardTitle className='flex items-center gap-2 text-base'>
					<Zap className='size-4' />
					MCP (Model Context Protocol)
				</CardTitle>
				<CardDescription>
					Conecta agentes de IA a los reclamos de tu organización con
					herramientas de solo lectura.
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				<BooleanField
					value={mcpShowSensitiveData}
					onValueChange={onShowSensitiveDataChange}
					label='Mostrar datos personales completos'
					description='Si está desactivado, nombres, DNI y contacto quedan enmascarados. El DNI se muestra como "7****887".'
					disabled={disabled}
				/>

				<Separator />

				<div className='space-y-2'>
					<p className='text-sm font-medium'>
						Herramientas habilitadas
					</p>
					<p className='text-xs text-muted-foreground'>
						Selecciona qué herramientas pueden usar los agentes de
						IA.
					</p>
					<div className='space-y-2 pt-1'>
						{ALL_TOOL_NAMES.map((toolName) => {
							const checked = mcpEnabledTools.includes(toolName)
							return (
								<label
									key={toolName}
									className='flex cursor-pointer items-center gap-3'
								>
									<input
										type='checkbox'
										checked={checked}
										disabled={disabled}
										onChange={() => toggleTool(toolName)}
										className='size-4 rounded border-border accent-primary'
									/>
									<span className='text-sm'>
										{
											MCP_TOOL_LABELS[
												toolName as keyof typeof MCP_TOOL_LABELS
											]
										}
									</span>
								</label>
							)
						})}
					</div>
				</div>

				<Separator />

				<div className='space-y-2'>
					<p className='text-sm font-medium'>URL del servidor MCP</p>
					<div className='flex items-center gap-2'>
						<div className='flex h-9 flex-1 items-center overflow-hidden rounded-md border bg-muted/50 px-3 font-mono text-xs text-muted-foreground'>
							<span className='truncate'>{mcpUrl}</span>
						</div>
						<Button
							type='button'
							variant='outline'
							size='sm'
							className='shrink-0'
							onClick={onCopy}
						>
							{copied ? (
								<Check className='size-3.5' />
							) : (
								<Copy className='size-3.5' />
							)}
						</Button>
					</div>
					<p className='text-xs text-muted-foreground'>
						Reemplaza{' '}
						<code className='rounded bg-muted px-1 py-0.5 font-mono text-xs'>
							[aqui-tu-api-key]
						</code>{' '}
						con tu API key.{' '}
						<a
							href='/dashboard/account'
							className='text-primary underline-offset-4 hover:underline'
						>
							Genera tu API key en tu perfil
						</a>
						.
					</p>
				</div>
			</CardContent>
		</Card>
	)
}
