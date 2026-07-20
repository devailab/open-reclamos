'use client'

import SelectField, { type SelectOption } from '@/components/forms/select-field'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { canGrantStoreAccess, type StoreAccessGrant } from '@/modules/rbac/lib'
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
	actorStoreAccess: StoreAccessGrant
	grantedStoreAccess?: StoreAccessGrant
	onStoreAccessModeChange: (mode: StoreAccessMode) => void
	onStoreIdsChange: (storeIds: string[]) => void
	disabled?: boolean
}

export function UserStoreAccessEditor({
	storeAccessMode,
	storeIds,
	storeOptions,
	actorStoreAccess,
	grantedStoreAccess,
	onStoreAccessModeChange,
	onStoreIdsChange,
	disabled = false,
}: UserStoreAccessEditorProps) {
	const isGrantable = (requestedAccess: StoreAccessGrant) => {
		return canGrantStoreAccess({
			actorAccess: actorStoreAccess,
			requestedAccess,
			alreadyGrantedAccess: grantedStoreAccess,
		})
	}

	const canGrantAllStores = isGrantable({
		storeAccessMode: 'all',
		storeIds: [],
	})
	const modeOptions = STORE_ACCESS_OPTIONS.map((option) => ({
		...option,
		disabled: option.value === 'all' && !canGrantAllStores,
	}))
	const selectedMode =
		modeOptions.find((option) => option.value === storeAccessMode) ??
		modeOptions[0]

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
			<div className='space-y-1'>
				<SelectField
					label='Acceso a tiendas'
					options={modeOptions}
					value={selectedMode}
					onValueChange={(value) =>
						onStoreAccessModeChange(
							(value?.value as StoreAccessMode) ?? 'all',
						)
					}
					disabled={disabled}
				/>
				{!canGrantAllStores && (
					<p className='text-xs text-muted-foreground'>
						Solo puedes otorgar acceso a tiendas que tienes
						asignadas.
					</p>
				)}
			</div>

			{storeAccessMode === 'selected' && (
				<div className='space-y-2'>
					<p className='text-sm font-medium'>Tiendas permitidas</p>
					<div className='max-h-56 space-y-2 overflow-y-auto pr-1'>
						{storeOptions.map((store) => {
							const checked = storeIds.includes(store.id)
							const isStoreDisabled =
								disabled ||
								!isGrantable({
									storeAccessMode: 'selected',
									storeIds: [store.id],
								})
							return (
								<div
									key={store.id}
									className={cn(
										'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
										checked
											? 'border-primary bg-primary/5'
											: 'border-border',
										isStoreDisabled &&
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
										disabled={isStoreDisabled}
									/>
									<span
										className='text-sm'
										onClick={() =>
											!isStoreDisabled &&
											toggleStore(store.id, !checked)
										}
										onKeyDown={(event) => {
											if (
												isStoreDisabled ||
												(event.key !== 'Enter' &&
													event.key !== ' ')
											) {
												return
											}
											event.preventDefault()
											toggleStore(store.id, !checked)
										}}
										role='button'
										tabIndex={isStoreDisabled ? -1 : 0}
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
