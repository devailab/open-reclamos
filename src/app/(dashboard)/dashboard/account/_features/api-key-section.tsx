'use client'

import { Check, Copy, KeyRound, RefreshCw, TriangleAlert } from 'lucide-react'
import { useState, useTransition } from 'react'
import { sileo } from 'sileo'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	$generateApiKeyAction,
	$regenerateApiKeyAction,
} from '@/modules/account/actions'

interface ApiKeySectionProps {
	hasApiKey: boolean
	apiKeyCreatedAt: Date | null
}

export function ApiKeySection({
	hasApiKey,
	apiKeyCreatedAt,
}: ApiKeySectionProps) {
	const [revealedKey, setRevealedKey] = useState<string | null>(null)

	const maskedRevealedKey = revealedKey
		? `${revealedKey.slice(0, 12)}••••••••••••••••••••••••${revealedKey.slice(-6)}`
		: null
	const [copied, setCopied] = useState(false)
	const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
	const [currentlyHasKey, setCurrentlyHasKey] = useState(hasApiKey)
	const [isPending, startTransition] = useTransition()

	const handleCopy = async () => {
		if (!revealedKey) return
		await navigator.clipboard.writeText(revealedKey)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	const handleGenerate = () => {
		startTransition(async () => {
			const result = await $generateApiKeyAction()

			if ('error' in result) {
				sileo.error({
					title: 'Error al generar API key',
					description: result.error,
				})
				return
			}

			setRevealedKey(result.apiKey)
			setCurrentlyHasKey(true)
		})
	}

	const handleRegenerate = () => {
		startTransition(async () => {
			const result = await $regenerateApiKeyAction()

			if ('error' in result) {
				sileo.error({
					title: 'Error al regenerar API key',
					description: result.error,
				})
				return
			}

			setRevealedKey(result.apiKey)
			setShowRegenerateConfirm(false)
			sileo.success({
				title: 'API key regenerada',
				description: 'Copia tu nueva clave, no volverá a mostrarse.',
			})
		})
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className='flex items-center gap-2 text-base'>
					<KeyRound className='size-4' />
					API key
				</CardTitle>
				<CardDescription>
					Usa esta clave para autenticarte en la API pública de Open
					Reclamos. Solo se muestra una vez al generarla.
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				{revealedKey ? (
					<div className='space-y-3'>
						<div className='flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2'>
							<code className='flex-1 break-all font-mono text-sm'>
								{maskedRevealedKey}
							</code>
							<Button
								variant='ghost'
								size='icon'
								className='size-7 shrink-0'
								onClick={handleCopy}
							>
								{copied ? (
									<Check className='size-3.5 text-green-600' />
								) : (
									<Copy className='size-3.5' />
								)}
							</Button>
						</div>
						<p className='flex items-center gap-1.5 text-xs text-amber-600'>
							<TriangleAlert className='size-3.5 shrink-0' />
							Copia esta clave ahora. No volverá a mostrarse una
							vez que salgas de esta página.
						</p>
					</div>
				) : currentlyHasKey ? (
					<div className='flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2'>
						<code className='flex-1 font-mono text-sm tracking-widest text-muted-foreground'>
							or_••••••••••••••••••••••••••••••••••••••••••••••••
						</code>
						{apiKeyCreatedAt && (
							<span className='shrink-0 text-xs text-muted-foreground'>
								Generada el{' '}
								{apiKeyCreatedAt.toLocaleDateString('es-PE', {
									day: '2-digit',
									month: 'short',
									year: 'numeric',
								})}
							</span>
						)}
					</div>
				) : null}

				<div className='flex items-center gap-2'>
					{!currentlyHasKey ? (
						<Button onClick={handleGenerate} disabled={isPending}>
							<KeyRound className='size-3.5' />
							{isPending ? 'Generando...' : 'Generar API key'}
						</Button>
					) : showRegenerateConfirm ? (
						<>
							<p className='text-sm text-muted-foreground'>
								¿Seguro? La clave anterior dejará de funcionar.
							</p>
							<Button
								variant='destructive'
								size='sm'
								onClick={handleRegenerate}
								disabled={isPending}
							>
								{isPending ? 'Regenerando...' : 'Confirmar'}
							</Button>
							<Button
								variant='ghost'
								size='sm'
								onClick={() => setShowRegenerateConfirm(false)}
								disabled={isPending}
							>
								Cancelar
							</Button>
						</>
					) : (
						<Button
							variant='outline'
							onClick={() => setShowRegenerateConfirm(true)}
							disabled={isPending}
						>
							<RefreshCw className='size-3.5' />
							Regenerar API key
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
