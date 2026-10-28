import { ArrowRight, KeyRound } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import TextField from '@/shared/components/forms/text-field'
import { Button } from '@/shared/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/shared/components/ui/dialog'
import { useForm } from '@/shared/hooks/use-form'
import { validateBusinessDomain } from '@/shared/lib/business-domain'
import { resolveSSOLogin } from '../api'
import { useActionScope } from '../hooks/use-action-scope'
import { errorMessage } from '../validation'

const INITIAL_VALUES = { domain: null as string | null }

export function SSOLoginDialog() {
	const [open, setOpen] = useState(false)
	const [values, setValues] = useState(INITIAL_VALUES)
	const [error, setError] = useState<string | null>(null)
	const [pending, startTransition] = useTransition()
	const { register, validate, reset } = useForm({
		values,
		setValues,
		initialValues: INITIAL_VALUES,
	})
	const actions = useActionScope()
	const navigate = useNavigate()
	const [params] = useSearchParams()

	const changeOpen = (next: boolean) => {
		if (pending) {
			return
		}

		reset()
		setError(null)
		setOpen(next)
	}

	const submit = (event: React.SubmitEvent<HTMLFormElement>) => {
		event.preventDefault()

		if (pending || validate({ focus: 'first' }).length) {
			return
		}

		const signal = actions.begin()
		setError(null)

		startTransition(async () => {
			try {
				const destination = await resolveSSOLogin(
					values.domain ?? '',
					signal,
				)
				signal.throwIfAborted()
				const returnTo = params.get('returnTo')
				const search = returnTo
					? `?${new URLSearchParams({ returnTo })}`
					: ''

				navigate(destination + search)
				reset()
				setOpen(false)
			} catch (cause) {
				if (!signal.aborted) {
					setError(errorMessage(cause))
				}
			}
		})
	}

	return (
		<>
			<Button
				variant='outline'
				className='w-full'
				onClick={() => changeOpen(true)}
			>
				<KeyRound /> Ingresar con SSO
			</Button>
			<Dialog open={open} onOpenChange={changeOpen}>
				<DialogContent
					className='sm:max-w-md'
					showCloseButton={!pending}
				>
					<form
						onSubmit={submit}
						className='space-y-5'
						autoComplete='off'
					>
						<DialogHeader>
							<DialogTitle>
								Ingresa con tu organización
							</DialogTitle>
							<DialogDescription>
								Escribe el dominio empresarial que te compartió
								tu administrador para encontrar tu acceso SSO.
							</DialogDescription>
						</DialogHeader>
						<TextField
							{...register('domain')}
							label='Dominio empresarial'
							placeholder='devailab.com'
							autoComplete='off'
							prefix={<KeyRound className='size-4' />}
							disabled={pending}
							validate={(value) =>
								!value?.trim()
									? 'Ingresa tu dominio empresarial.'
									: validateBusinessDomain(value)
							}
						/>
						<p className='text-xs text-muted-foreground'>
							Puede ser un dominio como devailab.com o un nombre
							como devailab. Si no lo conoces, consulta con tu
							administrador.
						</p>
						{error && (
							<p
								role='alert'
								className='text-sm text-destructive'
							>
								{error}
							</p>
						)}
						<DialogFooter>
							<Button
								type='button'
								variant='outline'
								disabled={pending}
								onClick={() => changeOpen(false)}
							>
								Cancelar
							</Button>
							<Button type='submit' disabled={pending}>
								{pending ? 'Buscando...' : 'Continuar'}{' '}
								<ArrowRight />
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</>
	)
}
