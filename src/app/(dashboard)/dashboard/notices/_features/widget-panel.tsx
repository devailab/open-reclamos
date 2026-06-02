'use client'

import {
	Check,
	Code,
	Copy,
	Eye,
	MoonStar,
	Share2,
	SunMedium,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { SelectOption } from '@/components/forms/select-field'
import { Button } from '@/components/ui/button'
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { FormFieldProps } from '@/hooks/use-form'
import { cn } from '@/lib/utils'
import { NoticeLinkSettings } from './notice-link-settings'
import { ShareModal } from './notice-share-modal'
import type { WidgetTheme } from './use-notice-state'

interface WidgetPanelProps {
	defaultQrUrl: string
	widgetUrl: string
	isCustomUrl: boolean
	selectedStore: SelectOption | null
	storeOptions: SelectOption[]
	qrUrlFieldProps: FormFieldProps<string | null>
	selectedStoreFieldProps: FormFieldProps<SelectOption | null>
	onClearSelectedStore: () => void
	widgetTheme: WidgetTheme
	onWidgetThemeChange: (value: WidgetTheme) => void
}

const THEME_META: Record<
	WidgetTheme,
	{
		label: string
		description: string
		icon: typeof SunMedium
	}
> = {
	light: {
		label: 'Claro',
		description: 'Boton con fondo claro y texto oscuro.',
		icon: SunMedium,
	},
	dark: {
		label: 'Oscuro',
		description: 'Boton con fondo oscuro y texto claro.',
		icon: MoonStar,
	},
}

const BUTTON_STYLES: Record<WidgetTheme, string> = {
	light: 'bg-white text-slate-900 border border-slate-200',
	dark: 'bg-slate-950 text-slate-50 border border-slate-800',
}

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
}

function claimBookSvgMarkup() {
	return `<svg aria-hidden="true" viewBox="0 0 363 145" width="90" height="36" style="display:block;width:90px;height:36px;flex-shrink:0;color:inherit"><path fill="currentColor" fill-rule="evenodd" d="m179.613 43.838 3.044 71.845c48.401-39.661 93.538-58.253 135.167-54.188L264.244 0c-33.725 1.729-62.108 15.939-84.631 43.838M24.354 84.631l62.104-59.059c30.126-6.49 59.983-1.583 89.502 17.657l.609 70.019C147.442 89.24 94.967 80.864 24.354 84.632Z"/><path fill="currentColor" d="M196.661 112.639c39.147-30.108 80.645-42.735 121.163-42.62l12.786 11.568c-27.993-2.38-56.549.876-85.849 11.568 37.367-7.094 78.804-11.361 87.676 2.435-48.057-1.012-96.469-2.875-135.776 17.048M22.528 99.853v-6.697c58.07-5.885 108.069.305 146.126 24.354-48.629-19.034-97.347-23.394-146.126-17.657"/><path fill="currentColor" d="M204.577 119.336c37.565-12.446 80.993-18.585 132.122-16.439v20.701c-36.794-6.626-81.882-7.295-132.122-4.262M22.528 105.333v19.483c48.474-2.674 96.396-3.76 143.691-3.044C121.678 104.168 73.75 98.8 22.528 105.333"/><path fill="currentColor" fill-rule="evenodd" d="M17.657 122.99v7.915l146.735-5.48c11.249 5.705 21.695 6.309 31.052 0l149.779 6.089V117.51l17.657 27.399-163.174-10.351c-10.399 7.858-22.64 8.972-37.14 1.827L.001 144.909z"/></svg>`
}

function buildWidgetSnippet({
	theme,
	href,
}: {
	theme: WidgetTheme
	href: string
}) {
	const escapedHref = escapeHtml(href)
	const color = theme === 'dark' ? '#f8fafc' : '#0f172a'
	const background = theme === 'dark' ? '#020617' : '#ffffff'
	const border = theme === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0'

	return `<a href="${escapedHref}" target="_blank" rel="noopener noreferrer" aria-label="Abrir Libro de Reclamaciones" title="Libro de Reclamaciones" style="display:inline-flex;width:200px;flex-direction:column;align-items:center;gap:14px;padding:16px 0;border-radius:16px;border:${border};background:${background};color:${color};font-family:inherit;font-size:20px;font-weight:700;line-height:1.2;text-decoration:none;text-align:center;"><span>Libro de Reclamaciones</span>${claimBookSvgMarkup()}</a>`
}

function ClaimBookIcon({ className }: { className?: string }) {
	return (
		<svg
			aria-hidden='true'
			viewBox='0 0 363 145'
			className={cn('h-5 w-12.5 shrink-0', className)}
		>
			<path
				fill='currentColor'
				fillRule='evenodd'
				d='m179.613 43.838 3.044 71.845c48.401-39.661 93.538-58.253 135.167-54.188L264.244 0c-33.725 1.729-62.108 15.939-84.631 43.838M24.354 84.631l62.104-59.059c30.126-6.49 59.983-1.583 89.502 17.657l.609 70.019C147.442 89.24 94.967 80.864 24.354 84.632Z'
			/>
			<path
				fill='currentColor'
				d='M196.661 112.639c39.147-30.108 80.645-42.735 121.163-42.62l12.786 11.568c-27.993-2.38-56.549.876-85.849 11.568 37.367-7.094 78.804-11.361 87.676 2.435-48.057-1.012-96.469-2.875-135.776 17.048M22.528 99.853v-6.697c58.07-5.885 108.069.305 146.126 24.354-48.629-19.034-97.347-23.394-146.126-17.657'
			/>
			<path
				fill='currentColor'
				d='M204.577 119.336c37.565-12.446 80.993-18.585 132.122-16.439v20.701c-36.794-6.626-81.882-7.295-132.122-4.262M22.528 105.333v19.483c48.474-2.674 96.396-3.76 143.691-3.044C121.678 104.168 73.75 98.8 22.528 105.333'
			/>
			<path
				fill='currentColor'
				fillRule='evenodd'
				d='M17.657 122.99v7.915l146.735-5.48c11.249 5.705 21.695 6.309 31.052 0l149.779 6.089V117.51l17.657 27.399-163.174-10.351c-10.399 7.858-22.64 8.972-37.14 1.827L.001 144.909z'
			/>
		</svg>
	)
}

function WidgetPreview({ url, theme }: { url: string; theme: WidgetTheme }) {
	return (
		<div className='flex flex-1 items-center justify-center p-8'>
			<a
				href={url}
				target='_blank'
				rel='noopener noreferrer'
				aria-label='Abrir Libro de Reclamaciones'
				title='Libro de Reclamaciones'
				className={cn(
					'inline-flex w-50 flex-col items-center gap-4 rounded-2xl py-4 text-center font-bold',
					BUTTON_STYLES[theme],
				)}
			>
				<span className='text-xl leading-5'>
					Libro de Reclamaciones
				</span>
				<ClaimBookIcon className='h-9 w-22.5' />
			</a>
		</div>
	)
}

export function WidgetPanel({
	defaultQrUrl,
	widgetUrl,
	isCustomUrl,
	selectedStore,
	storeOptions,
	qrUrlFieldProps,
	selectedStoreFieldProps,
	onClearSelectedStore,
	widgetTheme,
	onWidgetThemeChange,
}: WidgetPanelProps) {
	const [activeView, setActiveView] = useState<'preview' | 'code'>('preview')
	const [isCopied, setIsCopied] = useState(false)
	const [isShareOpen, setIsShareOpen] = useState(false)

	const snippet = useMemo(
		() =>
			buildWidgetSnippet({
				theme: widgetTheme,
				href: widgetUrl || defaultQrUrl,
			}),
		[defaultQrUrl, widgetTheme, widgetUrl],
	)

	const selectedTheme = THEME_META[widgetTheme]
	const SelectedThemeIcon = selectedTheme.icon

	const handleCopyCode = async () => {
		await navigator.clipboard.writeText(snippet)
		setIsCopied(true)
		window.setTimeout(() => setIsCopied(false), 1800)
	}

	return (
		<div className='grid flex-1 min-h-0 gap-6 xl:grid-cols-[300px_minmax(0,1fr)]'>
			<aside className='flex flex-col gap-5 overflow-y-auto xl:pr-2'>
				<div>
					<h1 className='text-lg font-semibold'>Widget embebible</h1>
					<p className='mt-0.5 text-sm text-muted-foreground'>
						Copia este boton en el footer o en un lugar visible de
						tu sitio web.
					</p>
				</div>

				<NoticeLinkSettings
					isCustomUrl={isCustomUrl}
					selectedStore={selectedStore}
					storeOptions={storeOptions}
					storeFieldProps={selectedStoreFieldProps}
					urlFieldProps={qrUrlFieldProps}
					onClearSelectedStore={onClearSelectedStore}
					customUrlNotice={
						<p className='text-xs text-muted-foreground'>
							Verifica que esta URL apunte al Libro de
							Reclamaciones correcto.
						</p>
					}
				/>

				<div className='space-y-2'>
					<p className='text-sm font-medium'>Tema del boton</p>
					<Select
						value={widgetTheme}
						onValueChange={(value) =>
							onWidgetThemeChange(value as WidgetTheme)
						}
					>
						<SelectTrigger className='w-full'>
							<SelectValue placeholder='Selecciona un tema'>
								<span className='flex items-center gap-2'>
									<SelectedThemeIcon className='size-4' />
									{selectedTheme.label}
								</span>
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{(
								Object.entries(THEME_META) as [
									WidgetTheme,
									(typeof THEME_META)[WidgetTheme],
								][]
							).map(([value, item]) => {
								const ItemIcon = item.icon
								return (
									<SelectItem key={value} value={value}>
										<ItemIcon className='size-4' />
										<div className='flex flex-col gap-0.5'>
											<span>{item.label}</span>
											<span className='text-xs text-muted-foreground'>
												{item.description}
											</span>
										</div>
									</SelectItem>
								)
							})}
						</SelectContent>
					</Select>

					<Button
						type='button'
						className='w-full mt-2'
						onClick={() => setIsShareOpen(true)}
					>
						<Share2 className='size-4' />
						Integrar en mi sitio web
					</Button>
				</div>
			</aside>

			<ShareModal
				open={isShareOpen}
				onOpenChange={setIsShareOpen}
				snippet={snippet}
			/>

			<Tabs
				value={activeView}
				onValueChange={(value) =>
					setActiveView(value as 'preview' | 'code')
				}
				className='flex flex-col flex-1 min-h-0'
			>
				<Card className='flex flex-col flex-1 min-h-0 overflow-hidden'>
					<CardHeader className='shrink-0 border-b'>
						<div className='flex flex-wrap items-center justify-between gap-3'>
							<div>
								<CardTitle>
									Botón de Libro de Reclamaciones
								</CardTitle>
							</div>
							<TabsList className='rounded-full p-1'>
								<TabsTrigger
									value='preview'
									className='px-4 py-2'
								>
									<Eye className='size-4' />
									Preview
								</TabsTrigger>
								<TabsTrigger value='code' className='px-4 py-2'>
									<Code className='size-4' />
									Codigo
								</TabsTrigger>
							</TabsList>
						</div>
					</CardHeader>

					<TabsContent
						value='preview'
						className='flex flex-1 min-h-0'
					>
						<WidgetPreview
							url={widgetUrl || defaultQrUrl}
							theme={widgetTheme}
						/>
					</TabsContent>

					<TabsContent
						value='code'
						className='flex flex-col flex-1 min-h-0'
					>
						<Textarea
							readOnly
							value={snippet}
							aria-label='Codigo HTML del widget'
							className='flex-1 resize-none rounded-none bg-slate-950 font-mono text-xs leading-5 text-slate-100'
						/>
					</TabsContent>

					<CardFooter className='shrink-0 justify-end gap-3'>
						<Button type='button' onClick={handleCopyCode}>
							{isCopied ? (
								<Check className='size-4' />
							) : (
								<Copy className='size-4' />
							)}
							{isCopied ? 'Codigo copiado' : 'Copiar codigo'}
						</Button>
					</CardFooter>
				</Card>
			</Tabs>
		</div>
	)
}
