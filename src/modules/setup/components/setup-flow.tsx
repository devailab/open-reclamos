'use client'

import { useState, useTransition } from 'react'
import { feedback } from '@/lib/feedback'
import {
	$completeSetupAction,
	$setupStoreAction,
	type SetupOrganizationInput,
	type SetupStoreInput,
} from '@/modules/setup/actions'
import { SetupStepper } from './setup-stepper'
import {
	type SetupCountryData,
	SetupStepOrganization,
} from './step-organization'
import { SetupStepStore } from './step-store'

type SetupFlowProps = {
	countries: SetupCountryData[]
	mode: 'setup' | 'dashboard'
	pendingOrganizationName?: string
}

export function SetupFlow({
	countries,
	mode,
	pendingOrganizationName,
}: SetupFlowProps) {
	const isResumingStore = pendingOrganizationName !== undefined
	const [step, setStep] = useState<'organization' | 'store'>(
		isResumingStore ? 'store' : 'organization',
	)
	const [organizationData, setOrganizationData] =
		useState<SetupOrganizationInput | null>(null)
	const [isPending, startTransition] = useTransition()

	const title =
		mode === 'dashboard'
			? 'Crea una nueva organización'
			: 'Configura tu cuenta'
	const description =
		mode === 'dashboard'
			? 'Completa estos pasos para habilitar una nueva empresa dentro de tu cuenta.'
			: 'Completa los pasos para empezar a usar el libro de reclamaciones'

	const handleOrganizationNext = (data: SetupOrganizationInput) => {
		setOrganizationData(data)
		setStep('store')
	}

	const handleStoreSubmit = async (store: SetupStoreInput) => {
		if (isResumingStore) {
			startTransition(async () => {
				const result = await $setupStoreAction(store)
				if (result?.error) {
					feedback.alert.error({
						title: 'Error al guardar tienda',
						description: result.error,
					})
				}
			})
			return
		}

		if (!organizationData) {
			setStep('organization')
			return
		}

		const confirmed = await feedback.confirm({
			title: '¿Completar el registro?',
			description: `Se registrará "${organizationData.name}" con RUC ${organizationData.ruc} y la tienda "${store.name}". Una vez creada no podrás modificar el RUC.`,
			confirmText: 'Sí, completar registro',
			cancelText: 'Revisar datos',
		})
		if (!confirmed) return

		startTransition(async () => {
			const result = await $completeSetupAction({
				organization: organizationData,
				store,
			})
			if (result?.error) {
				feedback.alert.error({
					title: 'Error al completar el registro',
					description: result.error,
				})
			}
		})
	}

	return (
		<div className='space-y-8'>
			<div className='flex items-center gap-3'>
				<div>
					<h1 className='text-xl font-semibold tracking-tight'>
						{title}
					</h1>
					<p className='text-sm text-muted-foreground'>
						{description}
					</p>
				</div>
			</div>

			<SetupStepper currentStep={step} />

			{/* Ambos pasos permanecen montados para conservar el estado al volver atrás */}
			{!isResumingStore && (
				<div className={step === 'organization' ? '' : 'hidden'}>
					<SetupStepOrganization
						countries={countries}
						onNext={handleOrganizationNext}
					/>
				</div>
			)}
			<div className={step === 'store' ? '' : 'hidden'}>
				<SetupStepStore
					organizationName={
						pendingOrganizationName ??
						organizationData?.name ??
						undefined
					}
					onBack={
						isResumingStore
							? undefined
							: () => setStep('organization')
					}
					onSubmit={handleStoreSubmit}
					isPending={isPending}
				/>
			</div>
		</div>
	)
}
