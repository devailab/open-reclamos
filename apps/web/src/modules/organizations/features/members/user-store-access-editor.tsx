import SelectField from '@/shared/components/forms/select-field'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { cn } from '@/shared/lib/utils'
import type { StoreAccessMode, StoreOption } from './types'

const OPTIONS = [
	{ value: 'all', label: 'Todas las tiendas' },
	{ value: 'selected', label: 'Solo algunas tiendas' },
]

export function UserStoreAccessEditor({
	mode,
	storeIds,
	stores,
	actorAllStores,
	onModeChange,
	onStoreIdsChange,
	disabled = false,
}: {
	mode: StoreAccessMode
	storeIds: string[]
	stores: StoreOption[]
	actorAllStores: boolean
	onModeChange: (mode: StoreAccessMode) => void
	onStoreIdsChange: (ids: string[]) => void
	disabled?: boolean
}) {
	return (
		<div className='space-y-4 rounded-xl border p-4'>
			<SelectField
				label='Acceso a tiendas'
				options={OPTIONS.map((option) => ({
					...option,
					disabled: option.value === 'all' && !actorAllStores,
				}))}
				value={OPTIONS.find((option) => option.value === mode) ?? null}
				onValueChange={(option) => {
					if (
						option?.value === 'all' ||
						option?.value === 'selected'
					) {
						onModeChange(option.value)
					}
				}}
				disabled={disabled}
			/>
			{!actorAllStores && (
				<p className='text-xs text-muted-foreground'>
					Solo puedes otorgar acceso a tiendas que tienes asignadas.
				</p>
			)}
			{mode === 'selected' && (
				<div className='max-h-56 space-y-2 overflow-y-auto pr-1'>
					<p className='text-sm font-medium'>Tiendas permitidas</p>
					{stores.length === 0 && (
						<p className='text-sm text-muted-foreground'>
							No hay tiendas disponibles.
						</p>
					)}
					{stores.map((store) => (
						<label
							htmlFor={`access-store-${store.id}`}
							key={store.id}
							className={cn(
								'flex cursor-pointer items-center gap-3 rounded-lg border p-3',
								storeIds.includes(store.id) &&
									'border-primary bg-primary/5',
							)}
						>
							<Checkbox
								id={`access-store-${store.id}`}
								disabled={disabled}
								checked={storeIds.includes(store.id)}
								onCheckedChange={(checked) =>
									onStoreIdsChange(
										checked
											? [
													...new Set([
														...storeIds,
														store.id,
													]),
												]
											: storeIds.filter(
													(id) => id !== store.id,
												),
									)
								}
							/>
							<span className='text-sm'>{store.name}</span>
						</label>
					))}
				</div>
			)}
		</div>
	)
}
