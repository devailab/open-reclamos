import { Check, ClipboardList, User } from 'lucide-react'
import type { FC } from 'react'
import { cn } from '@/lib/utils'

type Step = 'consumer' | 'details'

interface ComplaintStepperProps {
	currentStep: Step
	onStepClick: (step: Step) => void
}

const STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
	{
		id: 'consumer',
		label: 'Tus datos',
		icon: <User className='h-4 w-4' />,
	},
	{
		id: 'details',
		label: 'Detalles del reclamo',
		icon: <ClipboardList className='h-4 w-4' />,
	},
]

export const ComplaintStepper: FC<ComplaintStepperProps> = ({
	currentStep,
	onStepClick,
}) => {
	const currentIndex = STEPS.findIndex((s) => s.id === currentStep)

	return (
		<nav aria-label='Pasos del formulario'>
			<ol className='flex items-center gap-0'>
				{STEPS.map((step, index) => {
					const isCompleted = index < currentIndex
					const isActive = step.id === currentStep

					return (
						<li key={step.id} className='flex flex-1 items-center'>
							<button
								type='button'
								onClick={() => onStepClick(step.id)}
								className={cn(
									'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
									'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
									isActive
										? 'text-primary'
										: isCompleted
											? 'text-primary/70 hover:text-primary'
											: 'text-muted-foreground hover:text-foreground',
								)}
							>
								<span
									className={cn(
										'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs transition-colors',
										isActive
											? 'bg-primary text-primary-foreground'
											: isCompleted
												? 'bg-primary/20 text-primary'
												: 'bg-muted text-muted-foreground',
									)}
								>
									{isCompleted ? (
										<Check className='h-3.5 w-3.5' />
									) : (
										index + 1
									)}
								</span>
								<span className='hidden sm:inline'>
									{step.label}
								</span>
							</button>

							{index < STEPS.length - 1 && (
								<div
									className={cn(
										'h-px flex-1 mx-1 transition-colors',
										isCompleted
											? 'bg-primary/30'
											: 'bg-border',
									)}
								/>
							)}
						</li>
					)
				})}
			</ol>
		</nav>
	)
}
