import {
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
import { useRef, useState, useTransition } from 'react'
import { Link as RouterLink } from 'react-router'
import { sileo } from 'sileo'
import { PublicFormLink } from '@/modules/complaints/components/public-form-link'
import { authenticatedFetch } from '@/shared/api/rpc'
import { useSession } from '@/shared/auth/session'
import AutocompleteField, {
	type AutocompleteOption,
} from '@/shared/components/forms/autocomplete-field'
import BooleanField from '@/shared/components/forms/boolean-field'
import NumberField from '@/shared/components/forms/number-field'
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
import {
	ADDRESS_TYPE_OPTIONS,
	MAX_RESPONSE_DEADLINE_DAYS,
	MCP_TOOL_LABELS,
	MCP_TOOLS,
	MIN_RESPONSE_DEADLINE_DAYS,
} from '@/shared/constants/options'
import { useForm } from '@/shared/hooks/use-form'
import { usePublicSlug } from '@/shared/hooks/use-public-slug'
import { validateBusinessDomain } from '@/shared/lib/business-domain'
import { feedback } from '@/shared/lib/feedback'
import { required } from '@/shared/lib/validators'
import {
	removeOrganizationLogo,
	searchUbigeos,
	updateOrganizationSettings,
} from './api'
import { OrganizationLogo } from './organization-logo'
import type { OrganizationSettings } from './types'
import { useRequestSignal } from './use-request-signal'

interface OrgFormValues {
	businessDomain: string | null
	name: string | null
	legalName: string | null
	ubigeoOption: AutocompleteOption | null
	addressType: SelectOption | null
	address: string | null
	phoneCode: string | null
	phone: string | null
	website: string | null
	formEnabled: boolean
	responseDeadlineDays: number | null
	mcpShowSensitiveData: boolean
	primaryColor: string | null
}

interface OrganizationSettingsFormProps {
	org: OrganizationSettings
	currentUbigeoOption: AutocompleteOption | null
	canManage: boolean
	onSaved?: () => void
}

export function OrganizationSettingsForm({
	org,
	currentUbigeoOption,
	canManage,
	onSaved,
}: OrganizationSettingsFormProps) {
	const { refresh } = useSession()
	const getSignal = useRequestSignal()

	const getInitialAddressType = (): SelectOption | null => {
		return (
			ADDRESS_TYPE_OPTIONS.find((o) => o.value === org.addressType) ??
			null
		)
	}

	const initialValues: OrgFormValues = {
		businessDomain: org.businessDomain,
		name: org.name,
		legalName: org.legalName,
		ubigeoOption: currentUbigeoOption,
		addressType: getInitialAddressType(),
		address: org.address,
		phoneCode: org.phoneCode,
		phone: org.phone,
		website: org.website,
		formEnabled: org.formEnabled,
		responseDeadlineDays: org.responseDeadlineDays,
		mcpShowSensitiveData: org.mcpShowSensitiveData,
		primaryColor: org.primaryColor,
	}

	const ALL_TOOL_NAMES = Object.values(MCP_TOOLS)

	const getInitialEnabledTools = (): string[] => {
		const saved = org.mcpEnabledTools ?? ALL_TOOL_NAMES

		return ALL_TOOL_NAMES.filter((t) => saved.includes(t))
	}

	const [values, setValues] = useState<OrgFormValues>(initialValues)
	const publicSlug = usePublicSlug({
		kind: 'organization',
		name: values.name ?? '',
		initialSlug: org.slug,
		id: org.id,
	})

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
		if (!file) {
			return
		}

		const signal = getSignal()

		startUploadTransition(async () => {
			try {
				const formData = new FormData()

				formData.append('file', file)

				if (
					!['image/png', 'image/jpeg'].includes(file.type) ||
					file.size > 2 * 1024 * 1024
				) {
					throw new Error('Usa un archivo PNG o JPEG de máximo 2 MB.')
				}

				const response = await authenticatedFetch(
					'/api/organizations/logo',
					{
						method: 'POST',
						body: formData,
						signal,
					},
				)

				if (!response.ok) {
					throw new Error(await response.text())
				}

				await response.json()

				if (signal.aborted) {
					return
				}

				setLogoKey('uploaded')
				setLogoVersion((current) => current + 1)
				void refresh()
				sileo.success({ title: 'Logo actualizado' })
			} catch (error) {
				if (signal.aborted) {
					return
				}

				sileo.error({
					title: 'No se pudo subir el logo',
					description:
						error instanceof Error
							? error.message
							: 'Inténtalo nuevamente en unos segundos.',
				})
			} finally {
				if (logoInputRef.current) {
					logoInputRef.current.value = ''
				}
			}
		})
	}

	const handleRemoveLogo = () => {
		const signal = getSignal()

		startRemoveLogoTransition(async () => {
			const result = await removeOrganizationLogo(signal)

			if (signal.aborted) {
				return
			}

			if ('error' in result) {
				sileo.error({
					title: 'No se pudo quitar el logo',
					description: result.error,
				})

				return
			}

			setLogoKey(null)
			setLogoVersion((current) => current + 1)
			void refresh()
			sileo.success({ title: 'Logo eliminado' })
		})
	}

	const handleSubmit = async () => {
		const errors = validate({ focus: 'first' })

		if (errors.length > 0) {
			return
		}

		if (!(await publicSlug.check())) {
			return
		}

		if (
			publicSlug.slug !== org.slug &&
			!(await feedback.confirm({
				title: 'Cambiar URL de la organización',
				description:
					'La URL anterior del formulario dejará de funcionar. Actualiza los enlaces compartidos y los QR generados anteriormente. También cambiará el enlace de acceso por organización.',
				confirmText: 'Cambiar URL y guardar',
				cancelText: 'Cancelar',
			}))
		) {
			return
		}

		const signal = getSignal()

		startTransition(async () => {
			try {
				const result = await updateOrganizationSettings(
					{
						primaryColor: values.primaryColor,
						name: values.name,
						slug: publicSlug.slug,
						businessDomain: values.businessDomain,
						legalName: values.legalName,
						ubigeoId: values.ubigeoOption?.value ?? null,
						addressType: values.addressType?.value ?? null,
						address: values.address,
						phoneCode: values.phoneCode,
						phone: values.phone,
						website: values.website,
						formEnabled: values.formEnabled,
						responseDeadlineDays: values.responseDeadlineDays,
						mcpEnabledTools,
						mcpShowSensitiveData: values.mcpShowSensitiveData,
					},
					signal,
				)

				if (signal.aborted) {
					return
				}

				if ('error' in result) {
					sileo.error({
						title: 'Error al guardar',
						description: result.error,
					})

					return
				}

				void refresh()
				sileo.success({ title: 'Configuración guardada' })
				onSaved?.()
			} catch (error) {
				if (!signal.aborted) {
					sileo.error({
						title: 'Error al guardar',
						description:
							error instanceof Error
								? error.message
								: 'Inténtalo nuevamente.',
					})
				}
			}
		})
	}

	const handleCopyMcpUrl = () => {
		const url = `${window.location.origin}/mcp`

		navigator.clipboard.writeText(url).then(() => {
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		})
	}

	const disabled = isPending || !canManage

	return (
		<div className='grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-2'>
			{!canManage && (
				<div className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 xl:col-span-2'>
					Solo los administradores pueden editar la información de la
					organización.
				</div>
			)}

			<div className='min-w-0 space-y-6'>
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2 text-base'>
							<Building2 className='size-4' />
							Identidad visual
						</CardTitle>
						<CardDescription>
							Sube el logo de tu organización. Recomendado: PNG o
							JPG en formato cuadrado de 512x512 px y máximo 2 MB.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<TextField
							{...register('primaryColor')}
							label='Color principal'
							placeholder='#3B82F6'
							validate={(value) =>
								!value || /^#[0-9a-f]{6}$/i.test(value)
									? null
									: 'Usa un color hexadecimal válido.'
							}
							disabled={disabled}
						/>
						<div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
							<OrganizationLogo
								slug={org.slug}
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
										accept='image/png,image/jpeg'
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
						</div>
						<PublicSlugField
							kind='organization'
							slug={publicSlug.slug}
							onChange={publicSlug.setSlug}
							error={publicSlug.error}
							status={publicSlug.status}
							disabled={disabled}
							originalSlug={org.slug}
						/>

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
						<div className='space-y-2'>
							<TextField
								{...register('businessDomain')}
								label='Dominio empresarial (opcional)'
								placeholder='devailab.com'
								prefix={<Globe className='size-3.5' />}
								validate={validateBusinessDomain}
								autoComplete='off'
								emptyAsNull
								disabled={disabled}
							/>
							<p className='text-xs text-muted-foreground'>
								Tus usuarios lo ingresan en «Ingresar con SSO»
								desde el login general. Recomendamos tu dominio,
								como devailab.com, pero también puedes usar un
								nombre corto, como devailab. Sin https:// ni
								rutas.
							</p>
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
							onSearch={searchUbigeos}
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
			</div>

			<div className='min-w-0 space-y-6'>
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
								El formulario general y los formularios de todas
								las tiendas quedarán bloqueados públicamente
								hasta que lo vuelvas a activar.
							</div>
						)}

						<Separator />

						<PublicFormLink path={`/c/${publicSlug.slug}`} />
					</CardContent>
				</Card>

				<McpSettingsCard
					disabled={disabled}
					mcpEnabledTools={mcpEnabledTools}
					setMcpEnabledTools={setMcpEnabledTools}
					mcpShowSensitiveData={values.mcpShowSensitiveData}
					onShowSensitiveDataChange={(v) =>
						setValues((prev) => ({
							...prev,
							mcpShowSensitiveData: v,
						}))
					}
					copied={copied}
					onCopy={handleCopyMcpUrl}
				/>
			</div>

			{canManage && (
				<div className='flex justify-end xl:col-span-2'>
					<Button
						onClick={handleSubmit}
						disabled={
							isPending || publicSlug.status !== 'available'
						}
					>
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
		typeof window !== 'undefined' ? `${window.location.origin}/mcp` : '/mcp'

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
						Configura tu cliente MCP con el header{' '}
						<code className='rounded bg-muted px-1 py-0.5 font-mono text-xs'>
							Authorization: Bearer &lt;tu-api-key&gt;
						</code>
						. Nunca incluyas la API key en la URL.{' '}
						<RouterLink
							to='/dashboard/account'
							className='text-primary underline-offset-4 hover:underline'
						>
							Genera tu API key en tu perfil
						</RouterLink>
						.
					</p>
				</div>
			</CardContent>
		</Card>
	)
}
