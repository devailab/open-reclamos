'use client'

import {
	ArrowBigRight,
	ChevronLeft,
	Globe,
	Loader2,
	MapPin,
	Send,
	Store,
} from 'lucide-react'
import type { FC } from 'react'
import Turnstile from 'react-turnstile'
import ComboboxField, {
	type ComboboxOption,
} from '@/components/forms/combobox-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ADDRESS_TYPE_OPTIONS } from '@/lib/constants'
import { ComplaintStepper } from './complaint-stepper'
import { ComplaintSuccess } from './complaint-success'
import type { FlatReason } from './reason-tree-field'
import {
	type CountryOption,
	getDefaultDialCodeOption,
	StepConsumer,
} from './step-consumer'
import { StepDetails } from './step-details'
import { useComplaintForm } from './use-complaint-form'

interface StoreOption {
	id: string
	name: string
	slug: string
	type: string
	address: string | null
	addressType: string | null
	url: string | null
}

interface ComplaintFormProps {
	organizationId: string
	organizationName: string
	// Org mode: list of stores to select from
	stores?: StoreOption[]
	// Store mode: pre-selected store
	preselectedStore?: StoreOption
	totalStores?: number
	countries: CountryOption[]
	reasons: FlatReason[]
	turnstileSiteKey: string
}

function StoreInfo({
	store,
	addressLabel,
}: {
	store: StoreOption
	addressLabel: string | null
}) {
	const isPhysical = store.type === 'physical'
	return (
		<div className='flex items-start gap-3 text-sm'>
			<div className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground'>
				{isPhysical ? (
					<Store className='size-4' />
				) : (
					<Globe className='size-4' />
				)}
			</div>
			<div className='space-y-0.5'>
				<div className='flex items-center gap-2'>
					<span className='font-medium'>{store.name}</span>
				</div>
				{isPhysical && addressLabel && (
					<p className='flex items-center gap-1 text-muted-foreground'>
						<MapPin className='size-3 shrink-0' />
						{addressLabel}
					</p>
				)}
				{!isPhysical && store.url && (
					<a
						href={store.url}
						target='_blank'
						rel='noopener noreferrer'
						className='flex items-center gap-1 text-muted-foreground underline underline-offset-2'
					>
						{store.url}
					</a>
				)}
			</div>
		</div>
	)
}

export const ComplaintForm: FC<ComplaintFormProps> = ({
	organizationId,
	organizationName,
	stores,
	preselectedStore,
	totalStores,
	countries,
	reasons,
	turnstileSiteKey,
}) => {
	const defaultStoreId =
		preselectedStore?.id ?? (stores?.length === 1 ? stores[0]?.id : null)
	const defaultDialCodeOption = getDefaultDialCodeOption(countries)
	const form = useComplaintForm({
		organizationId,
		storeId: defaultStoreId,
		defaultDialCodeOption,
	})
	const storeOptions: ComboboxOption[] =
		stores?.map((store) => ({
			value: store.id,
			label: store.name,
		})) ?? []
	const selectedStoreOption =
		storeOptions.find((option) => option.value === form.selectedStoreId) ??
		null

	const activeStoreId = defaultStoreId ?? form.selectedStoreId ?? null
	const activeStore =
		preselectedStore ??
		stores?.find((s) => s.id === form.selectedStoreId) ??
		null

	const storeAddressLabel =
		activeStore?.type === 'physical' && activeStore.address
			? `${ADDRESS_TYPE_OPTIONS.find((o) => o.value === activeStore.addressType)?.label ?? activeStore.addressType} ${activeStore.address}`
			: null

	return (
		<div className='space-y-6'>
			{/* Store selector (org mode only) */}
			{stores && stores.length > 0 && !preselectedStore && (
				<Card>
					<CardContent className='space-y-4'>
						<ComboboxField
							label='Seleccione la tienda o sucursal'
							value={selectedStoreOption}
							onValueChange={(option) =>
								form.setSelectedStoreId(option?.value ?? null)
							}
							options={storeOptions}
							placeholder='Selecciona una tienda'
							disabled={form.isSubmitting}
							className='w-full'
						/>
						{stores && stores.length > 1 && activeStore && (
							<>
								<Separator />
								<p className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
									Detalles de la sucursal
								</p>
								<StoreInfo
									store={activeStore}
									addressLabel={storeAddressLabel}
								/>
							</>
						)}
					</CardContent>
				</Card>
			)}

			{/* Pre-selected store info — only when org has multiple stores */}
			{preselectedStore && totalStores && totalStores > 1 && (
				<Card>
					<CardContent className='space-y-3'>
						<p className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
							Detalles de la sucursal
						</p>
						<StoreInfo
							store={preselectedStore}
							addressLabel={storeAddressLabel}
						/>
					</CardContent>
				</Card>
			)}

			{/* Form — always rendered to keep field refs registered */}
			<Card>
				<CardHeader className='pb-4'>
					<div className='space-y-3'>
						<p className='text-xs text-muted-foreground uppercase tracking-wide'>
							{organizationName}
						</p>
						<ComplaintStepper
							currentStep={form.currentStep}
							onStepClick={form.goToStep}
						/>
					</div>
				</CardHeader>

				<Separator />

				<CardContent className='pt-6'>
					{/* Step 1 — always mounted, hidden when on step 2 */}
					<div
						className={
							form.currentStep === 'consumer' ? '' : 'hidden'
						}
					>
						<StepConsumer
							register={form.step1Register}
							values={form.step1Values}
							countries={countries}
							disabled={form.isSubmitting}
						/>
					</div>

					{/* Step 2 — always mounted, hidden when on step 1 */}
					<div
						className={
							form.currentStep === 'details' ? '' : 'hidden'
						}
					>
						<StepDetails
							register={form.step2Register}
							values={form.step2Values}
							storeId={activeStoreId ?? ''}
							reasons={reasons}
							files={form.uploadedFiles}
							onFilesChange={form.setUploadedFiles}
							disabled={form.isSubmitting}
						/>
					</div>
				</CardContent>

				<Separator />

				{/* Footer navigation */}
				<div className='flex flex-col gap-3 px-4'>
					{form.currentStep === 'details' && (
						<Turnstile
							sitekey={turnstileSiteKey}
							size='flexible'
							theme='auto'
							onVerify={(token) => form.setTurnstileToken(token)}
							onExpire={() => form.setTurnstileToken(null)}
							onError={() => form.setTurnstileToken(null)}
						/>
					)}

					<div className='flex items-center justify-between gap-4'>
						{form.currentStep === 'details' ? (
							<Button
								type='button'
								variant='outline'
								onClick={() => form.goToStep('consumer')}
								disabled={form.isSubmitting}
							>
								<ChevronLeft className='h-4 w-4' />
								Atrás
							</Button>
						) : (
							<div />
						)}

						{form.currentStep === 'consumer' ? (
							<Button
								type='button'
								onClick={() => form.goToStep('details')}
							>
								Continuar
								<ArrowBigRight />
							</Button>
						) : (
							<Button
								type='button'
								onClick={form.handleSubmit}
								disabled={form.isSubmitting || !activeStoreId}
							>
								{form.isSubmitting ? (
									<>
										<Loader2 className='mr-2 h-4 w-4 animate-spin' />
										Enviando...
									</>
								) : (
									<>
										<Send />
										Enviar reclamo
									</>
								)}
							</Button>
						)}
					</div>
				</div>
			</Card>

			{/* Success dialog */}
			{form.successData && (
				<ComplaintSuccess
					trackingCode={form.successData.trackingCode}
					correlative={form.successData.correlative}
					responseDeadline={form.successData.responseDeadline}
				/>
			)}
		</div>
	)
}
