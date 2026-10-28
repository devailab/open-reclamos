import { format, parseISO } from 'date-fns'
import { Copy, KeyRound, TriangleAlert } from 'lucide-react'
import { useCallback, useState, useTransition } from 'react'
import { sileo } from 'sileo'
import TextField from '@/shared/components/forms/text-field'
import { Button } from '@/shared/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/shared/components/ui/card'
import { useForm } from '@/shared/hooks/use-form'
import { useActionScope } from '../../hooks/use-action-scope'
import { useAuthQuery } from '../../hooks/use-auth-query'
import { errorMessage, validateName } from '../../validation'
import { createAPIKey, listAPIKeys, revokeAPIKey } from './api'

const INITIAL_VALUES = { name: null as string | null }

export function ApiKeySection({ organizationId }: { organizationId: string }) {
	const keys = useAuthQuery(
		useCallback(
			async (signal: AbortSignal) => {
				return organizationId ? listAPIKeys(signal) : []
			},
			[organizationId],
		),
	)

	const actions = useActionScope()
	const [values, setValues] = useState(INITIAL_VALUES)

	const { register, validate, reset } = useForm({
		values,
		setValues,
		initialValues: INITIAL_VALUES,
	})

	const [revealedKey, setRevealedKey] = useState<{
		id: string
		secret: string
	} | null>(null)

	const [revokeId, setRevokeId] = useState<string | null>(null)
	const [isPending, startTransition] = useTransition()

	return (
		<Card>
			<CardHeader>
				<CardTitle className='flex items-center gap-2 text-base'>
					<KeyRound className='size-4' />
					Claves API
				</CardTitle>
				<CardDescription>
					Claves personales para la empresa activa. Cada clave solo se
					muestra una vez al generarla.
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				{!organizationId ? (
					<p className='text-sm text-muted-foreground'>
						Selecciona una empresa para administrar sus claves API.
					</p>
				) : (
					<>
						<form
							className='flex flex-col gap-3'
							onSubmit={(event) => {
								event.preventDefault()

								if (validate({ focus: 'first' }).length) {
									return
								}

								const signal = actions.begin()

								startTransition(async () => {
									try {
										const key = await createAPIKey(
											values.name ?? '',
											signal,
										)

										signal.throwIfAborted()

										setRevealedKey({
											id: key.id,
											secret: key.api_key,
										})

										reset()
										keys.retry()

										sileo.success({
											title: 'API key generada',
										})
									} catch (error) {
										if (signal.aborted) {
											return
										}

										sileo.error({
											title: 'Error al generar API key',
											description: errorMessage(error),
										})
									}
								})
							}}
						>
							<TextField
								{...register('name')}
								label='Nombre de la clave'
								placeholder='Integración de reportes'
								validate={validateName}
								disabled={isPending}
							/>
							<Button type='submit' disabled={isPending}>
								{isPending ? 'Guardando...' : 'Generar API key'}
							</Button>
						</form>
						{revealedKey ? (
							<div className='space-y-3'>
								<div className='flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2'>
									<code className='flex-1 break-all font-mono text-sm'>
										{revealedKey.secret.slice(0, 8)}
										••••••••••••••••
									</code>
									<Button
										variant='ghost'
										size='icon'
										aria-label='Copiar API key'
										onClick={async () => {
											try {
												await navigator.clipboard.writeText(
													revealedKey.secret,
												)

												sileo.success({
													title: 'Clave copiada',
												})
											} catch {
												sileo.error({
													title: 'No se pudo copiar la clave',
												})
											}
										}}
									>
										<Copy className='size-3.5' />
									</Button>
								</div>
								<p className='flex items-center gap-1.5 text-xs text-amber-600'>
									<TriangleAlert className='size-3.5 shrink-0' />
									Copia esta clave ahora. No volverá a
									mostrarse cuando salgas de esta página.
								</p>
								<Button
									variant='outline'
									onClick={() => setRevealedKey(null)}
								>
									Ocultar clave
								</Button>
							</div>
						) : null}
						{keys.loading ? (
							<p role='status'>Cargando claves...</p>
						) : keys.error ? (
							<div role='alert'>
								{keys.error}
								<Button onClick={keys.retry}>Reintentar</Button>
							</div>
						) : keys.data?.length ? (
							<ul className='space-y-3'>
								{keys.data.map((key) => (
									<li
										key={key.id}
										className='space-y-2 rounded-lg border p-3'
									>
										<div className='flex items-center justify-between gap-3'>
											<div>
												<p className='text-sm font-medium'>
													{key.name}
												</p>
												<p className='text-xs text-muted-foreground'>
													Creada el{' '}
													{format(
														parseISO(
															key.created_at,
														),
														'dd/MM/yyyy',
													)}{' '}
													·{' '}
													{key.revoked_at
														? 'Revocada'
														: 'Activa'}
												</p>
											</div>
											{!key.revoked_at ? (
												<Button
													variant='outline'
													disabled={isPending}
													onClick={() =>
														setRevokeId(key.id)
													}
												>
													Revocar
												</Button>
											) : null}
										</div>
										{revokeId === key.id ? (
											<div className='space-y-2'>
												<p className='text-sm'>
													La clave dejará de
													funcionar. ¿Confirmas la
													revocación?
												</p>
												<div className='flex gap-2'>
													<Button
														variant='destructive'
														disabled={isPending}
														onClick={() =>
															startTransition(
																async () => {
																	const signal =
																		actions.begin()

																	try {
																		await revokeAPIKey(
																			key.id,
																			signal,
																		)

																		signal.throwIfAborted()

																		if (
																			revealedKey?.id ===
																			key.id
																		) {
																			setRevealedKey(
																				null,
																			)
																		}

																		setRevokeId(
																			null,
																		)

																		keys.retry()

																		sileo.success(
																			{
																				title: 'Clave revocada',
																			},
																		)
																	} catch (error) {
																		if (
																			signal.aborted
																		) {
																			return
																		}

																		sileo.error(
																			{
																				title: 'No se pudo revocar la clave',
																				description:
																					errorMessage(
																						error,
																					),
																			},
																		)
																	}
																},
															)
														}
													>
														Confirmar
													</Button>
													<Button
														variant='ghost'
														disabled={isPending}
														onClick={() =>
															setRevokeId(null)
														}
													>
														Cancelar
													</Button>
												</div>
											</div>
										) : null}
									</li>
								))}
							</ul>
						) : (
							<p className='text-sm text-muted-foreground'>
								Todavía no tienes claves API para esta empresa.
							</p>
						)}
					</>
				)}
			</CardContent>
		</Card>
	)
}
