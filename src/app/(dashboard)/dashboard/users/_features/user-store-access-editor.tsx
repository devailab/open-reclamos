'use client'

import SelectField, { type SelectOption } from '@/components/forms/select-field'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { StoreOption } from '@/modules/rbac/queries'
import type { StoreAccessMode } from '@/modules/users/validation'

const STORE_ACCESS_OPTIONS: SelectOption[] = [
	{ value: 'all', label: 'Todas las tiendas' },
	{ value: 'selected', label: 'Solo algunas tiendas' },
]

interface UserStoreAccessEditorProps {
	storeAccessMode: StoreAccessMode
	storeIds: string[]
	storeOptions: StoreOption[]
	onStoreAccessModeChange: (mode: StoreAccessMode) => void
	onStoreIdsChange: (storeIds: string[]) => void
	disabled?: boolean
}

export function UserStoreAccessEditor({
	storeAccessMode,
	storeIds,
	storeOptions,
	onStoreAccessModeChange,
	onStoreIdsChange,
	disabled = false,
}: UserStoreAccessEditorProps) {
	const selectedMode =
		STORE_ACCESS_OPTIONS.find(
			(option) => option.value === storeAccessMode,
		) ?? STORE_ACCESS_OPTIONS[0]

	const toggleStore = (storeId: string, checked: boolean) => {
		if (checked) {
			onStoreIdsChange([...storeIds, storeId])
			return
		}

		onStoreIdsChange(
			storeIds.filter((currentStoreId) => currentStoreId !== storeId),
		)
	}

	return (
		<div className='space-y-4 rounded-xl border p-4'>
			<SelectField
				label='Acceso a tiendas'
				options={STORE_ACCESS_OPTIONS}
				value={selectedMode}
				onValueChange={(value) =>
					onStoreAccessModeChange(
						(value?.value as StoreAccessMode) ?? 'all',
					)
				}
				disabled={disabled}
			/>

			{storeAccessMode === 'selected' && (
				<div className='space-y-2'>
					<p className='text-sm font-medium'>Tiendas permitidas</p>
					<div className='max-h-56 space-y-2 overflow-y-auto pr-1'>
						{storeOptions.map((store) => {
							const checked = storeIds.includes(store.id)
							return (
								<div
									key={store.id}
									className={cn(
										'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
										checked
											? 'border-primary bg-primary/5'
											: 'border-border',
										disabled &&
											'cursor-not-allowed opacity-60',
									)}
								>
									<Checkbox
										checked={checked}
										onCheckedChange={(nextChecked) =>
											toggleStore(
												store.id,
												Boolean(nextChecked),
											)
										}
										disabled={disabled}
									/>
									<span
										className='text-sm'
										onClick={() =>
											!disabled &&
											toggleStore(store.id, !checked)
										}
										onKeyDown={(event) => {
											if (
												disabled ||
												(event.key !== 'Enter' &&
													event.key !== ' ')
											) {
												return
											}
											event.preventDefault()
											toggleStore(store.id, !checked)
										}}
										role='button'
										tabIndex={disabled ? -1 : 0}
									>
										{store.name}
									</span>
								</div>
							)
						})}
					</div>
				</div>
			)}
		</div>
	)
}
