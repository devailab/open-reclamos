import { useCallback, useState, useTransition } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { sileo } from 'sileo'
import { useSession } from '@/shared/auth/session'
import type { SelectOption } from '@/shared/components/forms/select-field'
import TextField from '@/shared/components/forms/text-field'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/shared/components/ui/card'
import { useForm } from '@/shared/hooks/use-form'
import { navigateSession } from '../../identity/action-scope'
import { UserDocumentFields } from '../../identity/components/user-document-fields'
import { useActionScope } from '../../identity/hooks/use-action-scope'
import { useAuthQuery } from '../../identity/hooks/use-auth-query'
import {
	errorMessage,
	validateConfirmPassword,
	validateLastName,
	validateLoginPassword,
	validateName,
	validatePassword,
} from '../../identity/validation'
import { acceptInvitation, getInvitation } from '../features/invitations/api'

const INITIAL_VALUES = {
	name: null as string | null,
	lastName: null as string | null,
	documentType: null as SelectOption | null,
	documentNumber: null as string | null,
	password: null as string | null,
	confirmPassword: null as string | null,
}

export function InvitationPage() {
	const { token = '' } = useParams<{ token: string }>()

	return <InvitationContent key={token} token={token} />
}

function InvitationContent({ token }: { token: string }) {
	const actions = useActionScope()

	const invitation = useAuthQuery(
		useCallback(
			(signal: AbortSignal) => getInvitation(token, signal),
			[token],
		),
	)

	const { refresh } = useSession()
	const navigate = useNavigate()
	const [existingAccount, setExistingAccount] = useState(false)
	const [values, setValues] = useState(INITIAL_VALUES)
	const [isPending, startTransition] = useTransition()

	const { register, validate, reset } = useForm({
		values,
		setValues,
		initialValues: INITIAL_VALUES,
	})

	if (invitation.loading) {
		return <p role='status'>Comprobando invitación...</p>
	}

	if (invitation.error || !invitation.data) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Enlace no válido</CardTitle>
					<CardDescription>
						{invitation.error ??
							'Este enlace no existe, expiró o ya fue usado.'}
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-3'>
					<p>Pide a quien te invitó que genere un nuevo enlace.</p>
					<Button onClick={invitation.retry}>Reintentar</Button>
					<Link to='/login' className='block text-primary'>
						Ir a iniciar sesión
					</Link>
				</CardContent>
			</Card>
		)
	}

	const details = invitation.data

	return (
		<div className='mx-auto flex w-full max-w-lg flex-col gap-6'>
			<Card className='border-0 shadow-none'>
				<CardHeader>
					<Badge variant='secondary' className='w-fit'>
						Invitación de equipo
					</Badge>
					<CardTitle className='text-3xl'>
						Únete a {details.organization_name}
					</CardTitle>
					<CardDescription>
						Activa tu acceso con el rol de {details.role}.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className='text-sm text-muted-foreground'>
						Tu correo será registrado como{' '}
						<span className='font-medium text-foreground'>
							{details.email}
						</span>
						. Puedes usar este enlace aunque el registro público
						esté cerrado.
					</p>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>
						{existingAccount
							? 'Vincular cuenta existente'
							: 'Crear cuenta'}
					</CardTitle>
					<CardDescription>
						{existingAccount
							? 'Ingresa la contraseña actual de la cuenta invitada.'
							: 'Usa una contraseña de entre 12 y 256 caracteres.'}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						type='button'
						variant='outline'
						disabled={isPending}
						onClick={() => {
							setExistingAccount((current) => !current)
							reset()
						}}
					>
						{existingAccount
							? 'No tengo cuenta todavía'
							: 'Ya tengo una cuenta'}
					</Button>
					<form
						className='mt-4 space-y-4'
						onSubmit={(event) => {
							event.preventDefault()

							if (validate({ focus: 'first' }).length) {
								return
							}

							const signal = actions.begin()

							startTransition(async () => {
								try {
									const destination = await acceptInvitation(
										token,
										{
											email: details.email,
											name: values.name ?? '',
											lastName: values.lastName ?? '',
											password: values.password ?? '',
											documentType:
												values.documentType?.value ??
												'',
											documentNumber:
												values.documentNumber ?? '',
										},
										signal,
									)

									signal.throwIfAborted()
									reset()

									sileo.success({
										title: 'Invitación aceptada',
									})

									navigateSession(
										destination,
										signal,
										navigate,
										refresh,
									)
								} catch (error) {
									if (signal.aborted) {
										return
									}

									sileo.error({
										title: 'No se pudo aceptar la invitación',
										description: errorMessage(error),
									})
								}
							})
						}}
					>
						{!existingAccount ? (
							<>
								<TextField
									{...register('name')}
									label='Nombres'
									validate={validateName}
									disabled={isPending}
								/>
								<TextField
									{...register('lastName')}
									label='Apellidos'
									validate={validateLastName}
									disabled={isPending}
								/>
							</>
						) : null}
						<TextField
							value={details.email}
							label='Correo electrónico'
							disabled
						/>
						{!existingAccount ? (
							<UserDocumentFields
								documentType={register('documentType')}
								documentNumber={register('documentNumber')}
								disabled={isPending}
							/>
						) : null}
						<TextField
							{...register('password')}
							label={
								existingAccount
									? 'Contraseña actual'
									: 'Contraseña'
							}
							type='password'
							validate={
								existingAccount
									? validateLoginPassword
									: validatePassword
							}
							disabled={isPending}
						/>
						{!existingAccount ? (
							<TextField
								{...register('confirmPassword')}
								label='Confirmar contraseña'
								type='password'
								validate={validateConfirmPassword(
									values.password,
								)}
								disabled={isPending}
							/>
						) : null}
						<Button
							type='submit'
							className='w-full'
							disabled={isPending}
						>
							{isPending
								? 'Activando acceso...'
								: 'Aceptar invitación y entrar'}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
