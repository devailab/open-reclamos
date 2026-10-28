import type { Dispatch, SetStateAction } from 'react'
import BooleanField from '@/shared/components/forms/boolean-field'
import SelectField, {
	type SelectOption,
} from '@/shared/components/forms/select-field'
import TextField from '@/shared/components/forms/text-field'
import type { ComplaintsTableFilters } from '../../filters'
import type { ComplaintCategorySummary, StoreOption } from '../../types'

// Campos de filtro de reclamos; cada página decide cuáles son base y cuáles avanzados.
export function buildComplaintFilterFields({
	filters,
	setFilters,
	stores,
	categories,
}: {
	filters: ComplaintsTableFilters
	setFilters: Dispatch<SetStateAction<ComplaintsTableFilters>>
	stores: StoreOption[]
	categories: ComplaintCategorySummary[]
}) {
	const select = (
		key: 'storeId' | 'categoryId' | 'priority' | 'sort' | 'status',
		label: string,
		options: SelectOption[],
	) => (
		<SelectField
			key={key}
			label={label}
			options={options}
			value={
				options.find((option) => option.value === filters[key]) ??
				options[0]
			}
			onValueChange={(option) =>
				setFilters((current) => ({
					...current,
					[key]: option?.value ?? options[0].value,
				}))
			}
		/>
	)

	return {
		store: select('storeId', 'Tienda', [
			{ value: 'all', label: 'Todas las tiendas' },
			...stores.map((store) => ({
				value: store.id,
				label: store.name,
			})),
		]),
		category: select('categoryId', 'Categoría', [
			{ value: 'all', label: 'Todas las categorías' },
			...categories.map((category) => ({
				value: category.id,
				label: category.name,
			})),
		]),
		priority: select('priority', 'Prioridad', [
			{ value: 'all', label: 'Todas las prioridades' },
			{ value: 'low', label: 'Baja' },
			{ value: 'medium', label: 'Media' },
			{ value: 'high', label: 'Alta' },
			{ value: 'urgent', label: 'Urgente' },
		]),
		status: select('status', 'Estado', [
			{ value: 'all', label: 'Todos los estados' },
			{ value: 'open', label: 'Abierto' },
			{ value: 'in_review', label: 'En revisión' },
			{ value: 'resolved', label: 'Resuelto' },
		]),
		sort: select('sort', 'Ordenar por', [
			{ value: 'featured', label: 'Destacados primero' },
			{ value: 'newest', label: 'Fecha de llegada' },
			{ value: 'priority', label: 'Mayor prioridad' },
		]),
		dateStart: (
			<TextField
				key='date-start'
				type='date'
				label='Desde'
				value={filters.dateStart}
				onValueChange={(value) =>
					setFilters((current) => ({
						...current,
						dateStart: value ?? '',
					}))
				}
			/>
		),
		dateEnd: (
			<TextField
				key='date-end'
				type='date'
				label='Hasta'
				value={filters.dateEnd}
				onValueChange={(value) =>
					setFilters((current) => ({
						...current,
						dateEnd: value ?? '',
					}))
				}
			/>
		),
		overdue: (
			<BooleanField
				key='overdue'
				label='Solo vencidos'
				value={filters.overdue}
				onValueChange={(value) =>
					setFilters((current) => ({ ...current, overdue: value }))
				}
			/>
		),
		activeOnly: (
			<BooleanField
				key='active-only'
				label='Solo pendientes'
				value={filters.activeOnly}
				onValueChange={(value) =>
					setFilters((current) => ({ ...current, activeOnly: value }))
				}
			/>
		),
	}
}

export function countChangedFilters(
	filters: ComplaintsTableFilters,
	defaults: ComplaintsTableFilters,
	keys: (keyof ComplaintsTableFilters)[],
) {
	return keys.filter((key) => filters[key] !== defaults[key]).length
}
