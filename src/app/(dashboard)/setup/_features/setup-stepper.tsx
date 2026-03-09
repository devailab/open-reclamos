import { Building2, Store } from 'lucide-react'
import type { FC } from 'react'
import { cn } from '@/lib/utils'

type Step = 'organization' | 'store'

interface SetupStepperProps {
	currentStep: Step
}

const STEPS = [
	{
		key: 'organization' as Step,
		label: 'Empresa',
		description: 'Datos de la organización',
		icon: Building2,
	},
	{
		key: 'store' as Step,
		label: 'Tienda',
		description: 'Primera tienda',
		icon: Store,
	},
]

export const SetupStepper: FC<SetupStepperProps> = ({ currentStep }) => {
	const currentIndex = STEPS.findIndex((s) => s.key === currentStep)

	return (
		<div className='flex items-center gap-0'>
			{STEPS.map((step, index) => {
				const isCompleted = index < currentIndex
				const isActive = index === currentIndex
				const Icon = step.icon

				return (
					<div key={step.key} className='flex items-center'>
						{/* Step item */}
						<div className='flex items-center gap-3'>
							<div
								className={cn(
									'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
									isCompleted &&
										'border-primary bg-primary text-primary-foreground',
									isActive &&
										'border-primary bg-primary text-primary-foreground',
									!isCompleted &&
										!isActive &&
										'border-muted-foreground/30 bg-background text-muted-foreground',
								)}
							>
								<Icon className='h-4 w-4' />
							</div>
							<div className='hidden sm:block'>
								<p
									className={cn(
										'text-sm font-medium',
										isActive
											? 'text-foreground'
											: 'text-muted-foreground',
									)}
								>
									{step.label}
								</p>
								<p className='text-xs text-muted-foreground'>
									{step.description}
								</p>
							</div>
						</div>

						{/* Connector */}
						{index < STEPS.length - 1 && (
							<div
								className={cn(
									'mx-4 h-px flex-1 w-16 transition-colors',
									isCompleted
										? 'bg-primary'
										: 'bg-muted-foreground/20',
								)}
							/>
						)}
					</div>
				)
			})}
		</div>
	)
}
