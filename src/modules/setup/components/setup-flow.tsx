import { SetupStepper } from './setup-stepper'
import {
	type SetupCountryData,
	SetupStepOrganization,
} from './step-organization'
import { SetupStepStore } from './step-store'

type SetupFlowProps = {
	step: 'organization' | 'store'
	countries: SetupCountryData[]
	mode: 'setup' | 'dashboard'
	organizationName?: string
}

export function SetupFlow({
	step,
	countries,
	mode,
	organizationName,
}: SetupFlowProps) {
	const title =
		mode === 'dashboard'
			? 'Crea una nueva organización'
			: 'Configura tu cuenta'
	const description =
		mode === 'dashboard'
			? 'Completa estos pasos para habilitar una nueva empresa dentro de tu cuenta.'
			: 'Completa los pasos para empezar a usar el libro de reclamaciones'

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

			{step === 'organization' && (
				<SetupStepOrganization countries={countries} />
			)}
			{step === 'store' && (
				<SetupStepStore organizationName={organizationName} />
			)}
		</div>
	)
}
