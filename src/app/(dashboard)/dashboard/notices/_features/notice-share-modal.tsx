'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

interface ShareModalProps {
	open: boolean
	onOpenChange: (value: boolean) => void
	snippet: string
}

const PLATFORM_STEPS: Record<string, { steps: string[]; tip?: string }> = {
	html: {
		steps: [
			'Abre el archivo HTML de tu sitio (normalmente index.html o el template del footer).',
			'Pega el código justo antes del cierre de </body> o dentro del footer.',
			'Guarda el archivo y sube los cambios a tu servidor.',
		],
		tip: 'Si usas un framework como Laravel o Django, pégalo en el partial del footer.',
	},
	wordpress: {
		steps: [
			'En el panel de administración ve a Apariencia → Editor de bloques (o Widgets si usas el editor clásico).',
			'Agrega un bloque de tipo "HTML personalizado" en el footer o donde quieras el botón.',
			'Pega el código dentro del bloque y haz clic en Actualizar.',
		],
		tip: 'También puedes usar el plugin "Insert Headers and Footers" para pegarlo una sola vez en todo el sitio.',
	},
	wix: {
		steps: [
			'En el editor de Wix haz clic en Agregar elemento → Embed → HTML personalizado.',
			'Pega el código en el campo de HTML y confirma.',
			'Reubica el bloque en tu página y publica los cambios.',
		],
		tip: 'En Squarespace usa el bloque "Code" dentro de cualquier sección.',
	},
}

function StepBadge({ n }: { n: number }) {
	return (
		<span className='flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground'>
			{n}
		</span>
	)
}

export function ShareModal({ open, onOpenChange, snippet }: ShareModalProps) {
	const [copied, setCopied] = useState(false)
	const [platform, setPlatform] = useState('html')

	const handleCopy = async () => {
		await navigator.clipboard.writeText(snippet)
		setCopied(true)
		window.setTimeout(() => setCopied(false), 1800)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='flex max-h-[90vh] w-full max-w-4xl flex-col gap-0 overflow-hidden p-0'>
				<DialogHeader className='shrink-0 border-b px-6 py-5'>
					<DialogTitle className='text-lg'>
						Integra el botón en tu sitio web
					</DialogTitle>
					<DialogDescription>
						Copia el código HTML y pégalo donde quieras que aparezca
						el botón del Libro de Reclamaciones.
					</DialogDescription>
				</DialogHeader>

				<div className='flex flex-col gap-6 overflow-y-auto px-6 py-5'>
					<div className='flex flex-col gap-3'>
						<div className='flex items-center gap-2'>
							<StepBadge n={1} />
							<p className='text-sm font-semibold'>
								Copia el código HTML
							</p>
						</div>
						<div className='relative'>
							<Textarea
								readOnly
								value={snippet}
								aria-label='Codigo HTML del widget'
								className='h-28 resize-none rounded-lg bg-slate-950 font-mono text-xs leading-5 text-slate-100'
							/>
							<Button
								type='button'
								size='sm'
								variant='secondary'
								onClick={handleCopy}
								className='absolute right-2 top-2'
							>
								{copied ? (
									<Check className='size-3.5' />
								) : (
									<Copy className='size-3.5' />
								)}
								{copied ? 'Copiado' : 'Copiar'}
							</Button>
						</div>
					</div>

					<Separator />

					<div className='flex flex-col gap-3'>
						<div className='flex items-center gap-2'>
							<StepBadge n={2} />
							<p className='text-sm font-semibold'>
								Pégalo en tu plataforma
							</p>
						</div>

						<Tabs value={platform} onValueChange={setPlatform}>
							<TabsList className='h-9 w-full rounded-lg'>
								<TabsTrigger
									value='html'
									className='flex-1 text-xs'
								>
									HTML
								</TabsTrigger>
								<TabsTrigger
									value='wordpress'
									className='flex-1 text-xs'
								>
									WordPress
								</TabsTrigger>
								<TabsTrigger
									value='wix'
									className='flex-1 text-xs'
								>
									Wix / Squarespace
								</TabsTrigger>
							</TabsList>

							{Object.entries(PLATFORM_STEPS).map(
								([key, info]) => (
									<TabsContent
										key={key}
										value={key}
										className='mt-3 rounded-lg border bg-muted/40 px-4 py-3'
									>
										<ol className='flex flex-col gap-2.5'>
											{info.steps.map((step, index) => (
												<li
													key={step}
													className='flex gap-2.5 text-sm text-muted-foreground'
												>
													<span className='mt-0.5 shrink-0 font-medium text-foreground'>
														{index + 1}.
													</span>
													<span>{step}</span>
												</li>
											))}
										</ol>
										{info.tip && (
											<p className='mt-3 border-t pt-3 text-xs text-muted-foreground'>
												<strong>Consejo:</strong>{' '}
												{info.tip}
											</p>
										)}
									</TabsContent>
								),
							)}
						</Tabs>
					</div>

					<Separator />

					<div className='flex items-start gap-2'>
						<StepBadge n={3} />
						<div>
							<p className='text-sm font-semibold'>
								¡Listo! Verifica en tu sitio
							</p>
							<p className='mt-0.5 text-sm text-muted-foreground'>
								Abre tu sitio web y confirma que el botón
								aparece correctamente. Si no lo ves, limpia la
								caché del navegador o del CMS.
							</p>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
