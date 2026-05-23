import { CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Step = 'organization' | 'store'

interface SetupStepperProps {
	currentStep: Step
}

const steps = [
	{ key: 'organization' as Step, label: 'Organización' },
	{ key: 'store' as Step, label: 'Primera tienda' },
]

export function SetupStepper({ currentStep }: SetupStepperProps) {
	const currentIndex = steps.findIndex((step) => step.key === currentStep)

	return (
		<div className='flex items-center gap-3 rounded-xl border bg-background px-4 py-3'>
			{steps.map((step, index) => {
				const isComplete = index < currentIndex
				const isCurrent = step.key === currentStep

				return (
					<div key={step.key} className='flex items-center gap-3'>
						<div className='flex items-center gap-2'>
							{isComplete ? (
								<CheckCircle2 className='size-4 text-primary' />
							) : (
								<Circle
									className={cn(
										'size-4',
										isCurrent
											? 'text-primary'
											: 'text-muted-foreground',
									)}
								/>
							)}
							<span
								className={cn(
									'text-sm',
									isCurrent
										? 'font-medium text-foreground'
										: 'text-muted-foreground',
								)}
							>
								{step.label}
							</span>
						</div>
						{index < steps.length - 1 && (
							<div className='h-px w-8 bg-border' />
						)}
					</div>
				)
			})}
		</div>
	)
}
