'use client'

import type { FC } from 'react'
import BooleanField from '@/components/forms/boolean-field'
import ChoiceCardField from '@/components/forms/choice-card-field'
import DateField from '@/components/forms/date-field'
import NumberField from '@/components/forms/number-field'
import SelectField, { type SelectOption } from '@/components/forms/select-field'
import TextField from '@/components/forms/text-field'
import TextAreaField from '@/components/forms/textarea-field'
import { Separator } from '@/components/ui/separator'
import type { useForm } from '@/hooks/use-form'
import {
	COMPLAINT_TYPE_OPTIONS,
	CURRENCY_OPTIONS,
	ITEM_TYPE_OPTIONS,
	PROOF_TYPE_OPTIONS,
} from '@/lib/constants'
import { required } from '@/lib/validators'
import {
	validateComplaintType,
	validateConfirmation,
	validateItemDescription,
} from '../validation'
import { FileUploadArea, type UploadedFile } from './file-upload-area'
import ReasonTreeField, { type FlatReason } from './reason-tree-field'

export interface Step2Values {
	complaintType: string | null
	itemType: string | null
	itemDescription: string | null
	currency: SelectOption | null
	amount: number | null
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
	storeId: string
	reasons: FlatReason[]
	files: UploadedFile[]
	onFilesChange: (action: FilesAction) => void
	disabled?: boolean
}

export const StepDetails: FC<StepDetailsProps> = ({
	register,
	values,
	storeId,
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
									{...register('proofOfPaymentNumber')}
									label='Número de comprobante'
									placeholder='F001-00001234'
									disabled={disabled}
								/>
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
				label='Detalle del reclamo o queja'
				placeholder='Describe con detalle lo ocurrido...'
				rows={4}
				disabled={disabled}
			/>

			{/* Pedido */}
			<TextAreaField
				{...register('request')}
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
					storeId={storeId}
					files={files}
					onChange={onFilesChange}
					disabled={disabled}
				/>
			</div>

			<Separator />

			{/* Confirmación */}
			<BooleanField
				{...register('confirmationCheck')}
				label='Confirmo y acredito que toda la información ingresada es correcta y me encuentro conforme con los términos del reclamo o queja.'
				variant='checkbox'
				validate={validateConfirmation}
				disabled={disabled}
			/>
		</div>
	)
}
