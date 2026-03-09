import type { FC } from 'react'
import { SetupStepper } from './setup-stepper'
import { StepOrganization } from './step-organization'
import { StepStore } from './step-store'

interface CountryData {
	id: string
	name: string
	iso2: string
	phoneCode: string
}

type SetupFormProps =
	| { step: 'organization'; countries: CountryData[] }
	| { step: 'store'; countries: CountryData[]; organizationId: string }

export const SetupForm: FC<SetupFormProps> = (props) => {
	return (
		<div className='space-y-8'>
			<div className='flex items-center gap-3'>
				<div>
					<h1 className='text-xl font-semibold tracking-tight'>
						Configura tu cuenta
					</h1>
					<p className='text-sm text-muted-foreground'>
						Completa los pasos para empezar a usar el libro de
						reclamaciones
					</p>
				</div>
			</div>

			<SetupStepper currentStep={props.step} />

			{props.step === 'organization' && (
				<StepOrganization countries={props.countries} />
			)}

			{props.step === 'store' && (
				<StepStore organizationId={props.organizationId} />
			)}
		</div>
	)
}
