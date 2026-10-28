import type { FC } from 'react'
import BooleanField from '@/shared/components/forms/boolean-field'
import ChoiceCardField from '@/shared/components/forms/choice-card-field'
import DateField from '@/shared/components/forms/date-field'
import NumberField from '@/shared/components/forms/number-field'
import SelectField, {
	type SelectOption,
} from '@/shared/components/forms/select-field'
import TextField from '@/shared/components/forms/text-field'
import TextAreaField from '@/shared/components/forms/textarea-field'
import { Separator } from '@/shared/components/ui/separator'
import {
	COMPLAINT_TYPE_OPTIONS,
	CURRENCY_OPTIONS,
	ITEM_TYPE_OPTIONS,
	PROOF_TYPE_OPTIONS,
} from '@/shared/constants/options'
import type { useForm } from '@/shared/hooks/use-form'
import { required } from '@/shared/lib/validators'
import {
	maxText,
	validateAmount,
	validateComplaintType,
	validateConfirmation,
	validateItemDescription,
} from '../../validation'
import { FileUploadArea, type UploadedFile } from './file-upload-area'
import ReasonTreeField, { type FlatReason } from './reason-tree-field'

export interface Step2Values {
	complaintType: string | null
	itemType: string | null
	itemDescription: string | null
	currency: SelectOption | null
	amount: number | null
	claimsAmount: boolean
	hasProofOfPayment: boolean
	proofOfPaymentType: SelectOption | null
	proofOfPaymentNumber: string | null
	reasonOption: SelectOption | null
	incidentDate: Date | null
	description: string | null
	request: string | null
	confirmationCheck: boolean
}

export const STEP2_INITIAL: Step2Values = {
	complaintType: null,
	itemType: null,
	itemDescription: null,
	currency: null,
	amount: null,
	claimsAmount: false,
	hasProofOfPayment: false,
	proofOfPaymentType: null,
	proofOfPaymentNumber: null,
	reasonOption: null,
	incidentDate: null,
	description: null,
	request: null,
	confirmationCheck: false,
}

// Matches Dispatch<SetStateAction<UploadedFile[]>> without importing React types
type FilesAction = UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])

interface StepDetailsProps {
	register: ReturnType<typeof useForm<Step2Values>>['register']
	values: Step2Values
	storeSlug: string
	turnstileToken: string | null
	captchaRequired: boolean
	onCaptchaConsumed: () => void
	reasons: FlatReason[]
	files: UploadedFile[]
	onFilesChange: (action: FilesAction) => void
	disabled?: boolean
}

export const StepDetails: FC<StepDetailsProps> = ({
	register,
	values,
	storeSlug,
	turnstileToken,
	captchaRequired,
	onCaptchaConsumed,
	reasons,
	files,
	onFilesChange,
	disabled,
}) => {
	const isClaim = values.complaintType === 'claim'

	return (
		<div className='space-y-6'>
			{/* Tipo de reclamo */}
			<ChoiceCardField
				{...register('complaintType')}
				label='Tipo de reclamo *'
				options={COMPLAINT_TYPE_OPTIONS.map((option) => ({
					value: option.value,
					label: option.label,
					description: option.description,
				}))}
				validate={validateComplaintType}
				disabled={disabled}
			/>

			{/* Campos solo para reclamo */}
			{isClaim && (
				<>
					<Separator />
					<div className='space-y-4'>
						<ChoiceCardField
							{...register('itemType')}
							label='Tipo del bien *'
							options={ITEM_TYPE_OPTIONS.map((option) => ({
								value: option.value,
								label: option.label,
							}))}
							validate={required}
							disabled={disabled}
						/>

						<TextAreaField
							{...register('itemDescription')}
							label='Descripción del producto o servicio *'
							placeholder='Describe el producto o servicio adquirido...'
							rows={3}
							validate={validateItemDescription}
							disabled={disabled}
						/>

						<BooleanField
							label='Deseo reclamar un monto'
							description='Active esta opción si su reclamo involucra un monto económico (opcional)'
							variant='normal'
							{...register('claimsAmount')}
							disabled={disabled}
						/>

						{values.claimsAmount && (
							<div className='space-y-4'>
								<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
									<SelectField
										{...register('currency')}
										label='Moneda'
										placeholder='Selecciona...'
										options={CURRENCY_OPTIONS}
										disabled={disabled}
									/>
									<NumberField
										{...register('amount')}
										label='Monto reclamado'
										placeholder='0.00'
										min={0}
										max={99999999.99}
										allowNegative={false}
										validate={validateAmount}
										allowDecimals
										disabled={disabled}
									/>
								</div>

								<BooleanField
									{...register('hasProofOfPayment')}
									label='Tengo comprobante de pago'
									variant='normal'
									disabled={disabled}
								/>

								{values.hasProofOfPayment && (
									<div className='grid grid-cols-1 gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2'>
										<SelectField
											{...register('proofOfPaymentType')}
											label='Tipo de comprobante'
											placeholder='Selecciona...'
											options={PROOF_TYPE_OPTIONS}
											disabled={disabled}
										/>
										<TextField
											{...register(
												'proofOfPaymentNumber',
											)}
											validate={maxText(50)}
											label='Número de comprobante'
											placeholder='F001-00001234'
											disabled={disabled}
										/>
									</div>
								)}
							</div>
						)}
					</div>
				</>
			)}

			<Separator />

			{/* Motivo */}
			{reasons.length > 0 && (
				<ReasonTreeField
					{...register('reasonOption')}
					reasons={reasons}
					label='Motivo'
					disabled={disabled}
				/>
			)}

			{/* Fecha del incidente */}
			<DateField
				{...register('incidentDate')}
				label='Fecha del incidente'
				placeholder='Selecciona una fecha'
				maxDate={new Date()}
				disabled={disabled}
			/>

			{/* Descripción */}
			<TextAreaField
				{...register('description')}
				validate={maxText(5000)}
				label='Detalle del reclamo o queja'
				placeholder='Describe con detalle lo ocurrido...'
				rows={4}
				disabled={disabled}
			/>

			{/* Pedido */}
			<TextAreaField
				{...register('request')}
				validate={maxText(5000)}
				label='¿Qué solución solicitas?'
				placeholder='Indica qué esperas que la empresa haga para resolver tu reclamo...'
				rows={3}
				disabled={disabled}
			/>

			<Separator />

			{/* Archivos adjuntos */}
			<div className='space-y-2'>
				<p className='text-sm font-medium'>
					Archivos adjuntos{' '}
					<span className='font-normal text-muted-foreground'>
						(opcional)
					</span>
				</p>
				<p className='text-xs text-muted-foreground'>
					Puedes adjuntar imágenes o documentos PDF como evidencia.
				</p>
				<FileUploadArea
					storeSlug={storeSlug}
					turnstileToken={turnstileToken}
					captchaRequired={captchaRequired}
					onCaptchaConsumed={onCaptchaConsumed}
					files={files}
					onChange={onFilesChange}
					disabled={disabled}
				/>
			</div>

			<Separator />

			{/* Confirmación */}
			<BooleanField
				{...register('confirmationCheck')}
				label='Declaro ser titular de la información proporcionada, que los datos son veraces y autorizo el tratamiento de mis datos personales únicamente para atender mi reclamo.'
				variant='checkbox'
				validate={validateConfirmation}
				disabled={disabled}
			/>
		</div>
	)
}
