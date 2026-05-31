'use client'

import { type FC, useEffect, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import TextField from '@/components/forms/text-field'
import TextAreaField from '@/components/forms/textarea-field'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { useForm } from '@/hooks/use-form'
import { combine, minLength, required } from '@/lib/validators'
import {
	$createCategoryAction,
	$updateCategoryAction,
} from '@/modules/categories/actions'
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
	const [isPending, startTransition] = useTransition()

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

	const handleSubmit = () => {
		const errors = validate()
		if (errors.length > 0) return

		startTransition(async () => {
			const result = category
				? await $updateCategoryAction({
						id: category.id,
						name: values.name ?? '',
						description: values.description,
					})
				: await $createCategoryAction({
						name: values.name ?? '',
						description: values.description,
					})

			if ('error' in result) {
				sileo.error({
					title: category
						? 'Error al actualizar categoría'
						: 'Error al crear categoría',
					description: result.error,
				})
				return
			}

			sileo.success({
				title: category ? 'Categoría actualizada' : 'Categoría creada',
			})
			onSuccess()
			handleOpenChange(false)
		})
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
