import type { FC } from 'react'
import SelectField, {
	type SelectOption,
} from '@/shared/components/forms/select-field'
import TextField from '@/shared/components/forms/text-field'
import { DOCUMENT_TYPE_OPTIONS } from '@/shared/constants/options'
import type { FormFieldProps } from '@/shared/hooks/use-form'
import { required } from '@/shared/lib/validators'
import { validateUserDocumentNumber } from '../validation'

interface UserDocumentFieldsProps {
	documentType: FormFieldProps<SelectOption | null>
	documentNumber: FormFieldProps<string | null>
	disabled?: boolean
}

// Documento de identidad de la cuenta; el número se envía como texto (admite ceros iniciales).
export const UserDocumentFields: FC<UserDocumentFieldsProps> = ({
	documentType,
	documentNumber,
	disabled,
}) => (
	<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
		<SelectField
			{...documentType}
			label='Tipo de documento'
			placeholder='Selecciona...'
			options={DOCUMENT_TYPE_OPTIONS}
			validate={required}
			disabled={disabled}
		/>
		<TextField
			{...documentNumber}
			label='Número de documento'
			placeholder='00012345'
			validate={validateUserDocumentNumber}
			disabled={disabled}
		/>
	</div>
)
