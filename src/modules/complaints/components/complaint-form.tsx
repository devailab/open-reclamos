'use client'

import { ChevronLeft, Loader2, Send } from 'lucide-react'
import type { FC } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { ComplaintStepper } from './complaint-stepper'
import { ComplaintSuccess } from './complaint-success'
import type { FlatReason } from './reason-tree-field'
import { type CountryOption, StepConsumer } from './step-consumer'
import { StepDetails } from './step-details'
import { useComplaintForm } from './use-complaint-form'

interface StoreOption {
	id: string
	name: string
	slug: string
}

interface ComplaintFormProps {
	organizationId: string
	organizationName: string
	// Org mode: list of stores to select from
	stores?: StoreOption[]
	// Store mode: pre-selected store
	preselectedStore?: StoreOption
	countries: CountryOption[]
	reasons: FlatReason[]
}

export const ComplaintForm: FC<ComplaintFormProps> = ({
	organizationId,
	organizationName,
	stores,
	preselectedStore,
	countries,
	reasons,
}) => {
	const form = useComplaintForm({
		organizationId,
		storeId: preselectedStore?.id ?? null,
	})

	const activeStoreId = preselectedStore?.id ?? form.selectedStoreId ?? null

	return (
		<div className='space-y-6'>
			{/* Store selector (org mode only) */}
			{stores && stores.length > 0 && !preselectedStore && (
				<Card>
					<CardHeader className='pb-3'>
						<CardTitle className='text-sm font-medium text-muted-foreground'>
							¿En cuál de nuestras tiendas ocurrió el incidente?
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
							{stores.map((store) => (
								<button
									key={store.id}
									type='button'
									onClick={() =>
										form.setSelectedStoreId(store.id)
									}
									className={cn(
										'rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all',
										'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
										form.selectedStoreId === store.id
											? 'border-primary bg-primary/5 ring-1 ring-primary'
											: 'border-border hover:border-primary/40 hover:bg-muted/40',
									)}
								>
									{store.name}
								</button>
							))}
						</div>
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
				<div className='flex items-center justify-between gap-4 p-4'>
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
									<Send className='mr-2 h-4 w-4' />
									Enviar reclamo
								</>
							)}
						</Button>
					)}
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
