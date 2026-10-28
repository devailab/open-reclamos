import { type FC, useEffect, useRef, useState } from 'react'
import { useFetcher } from 'react-router'
import { sileo } from 'sileo'
import TextField from '@/shared/components/forms/text-field'
import TextAreaField from '@/shared/components/forms/textarea-field'
import { Button } from '@/shared/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/shared/components/ui/dialog'
import { useForm } from '@/shared/hooks/use-form'
import { combine, minLength, required } from '@/shared/lib/validators'
import type { action } from '../../pages/categories-page'
import type { CategoryRow } from './types'

interface CategoryFormValues {
	name: string | null
	description: string | null
}

interface CategoryFormDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	category?: CategoryRow | null
	onSuccess: () => void
}

const validateName = combine(
	required,
	minLength(2, 'La categoría debe tener al menos 2 caracteres'),
)

export const CategoryFormDialog: FC<CategoryFormDialogProps> = ({
	open,
	onOpenChange,
	category,
	onSuccess,
}) => {
	const initialValues: CategoryFormValues = {
		name: category?.name ?? null,
		description: category?.description ?? null,
	}

	const [values, setValues] = useState<CategoryFormValues>(initialValues)
	const fetcher = useFetcher<typeof action>()
	const isPending = fetcher.state !== 'idle'
	const handled = useRef<unknown>(null)

	useEffect(() => {
		setValues({
			name: category?.name ?? null,
			description: category?.description ?? null,
		})
	}, [category])

	const { register, validate, reset } = useForm({
		values,
		setValues: (updater) => setValues((prev) => updater(prev)),
		initialValues,
	})

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) {
			reset()

			setValues({
				name: category?.name ?? null,
				description: category?.description ?? null,
			})
		}

		onOpenChange(nextOpen)
	}

	useEffect(() => {
		if (
			!fetcher.data ||
			fetcher.state !== 'idle' ||
			handled.current === fetcher.data
		) {
			return
		}

		handled.current = fetcher.data

		if ('error' in fetcher.data) {
			sileo.error({
				title: category
					? 'Error al actualizar categoría'
					: 'Error al crear categoría',
				description: fetcher.data.error,
			})

			return
		}

		sileo.success({
			title: category ? 'Categoría actualizada' : 'Categoría creada',
		})

		onSuccess()
		handleOpenChange(false)
	})

	const handleSubmit = () => {
		if (validate().length > 0) {
			return
		}

		void fetcher.submit(
			{
				intent: category ? 'update' : 'create',
				id: category?.id ?? '',
				name: values.name ?? '',
				description: values.description ?? '',
			},
			{ method: 'post' },
		)
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className='sm:max-w-lg'>
				<DialogHeader>
					<DialogTitle>
						{category ? 'Editar categoría' : 'Nueva categoría'}
					</DialogTitle>
				</DialogHeader>

				<div className='space-y-4'>
					<TextField
						{...register('name')}
						label='Nombre'
						placeholder='Cobros indebidos'
						validate={validateName}
						disabled={isPending}
					/>
					<TextAreaField
						{...register('description')}
						label='Descripción'
						placeholder='Describe cuándo debe usarse esta categoría.'
						rows={4}
						disabled={isPending}
					/>
				</div>

				<DialogFooter>
					<Button
						variant='outline'
						onClick={() => handleOpenChange(false)}
						disabled={isPending}
					>
						Cancelar
					</Button>
					<Button onClick={handleSubmit} disabled={isPending}>
						{isPending ? 'Guardando...' : 'Guardar'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
