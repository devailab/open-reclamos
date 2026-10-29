import { useEffect, useState } from 'react'
import {
	useLoaderData,
	useLocation,
	useParams,
	useRevalidator,
} from 'react-router'
import { Button } from '@/shared/components/ui/button'
import { ComplaintForm } from '../features/public-book/complaint-form'
import { ComplaintPageLayout } from '../features/public-book/complaint-page-layout'
import { FormUnavailableCard } from '../features/public-book/form-unavailable-card'
import type { publicBookLoader } from './public-book-loader'

export function PublicBookPage() {
	const { slug = '' } = useParams<{ slug: string }>()
	const { pathname } = useLocation()
	const kind = pathname.startsWith('/s/') ? 'store' : 'organization'

	const { book: pendingBook } = useLoaderData<typeof publicBookLoader>()
	const revalidator = useRevalidator()
	const [result, setResult] = useState<{
		source: typeof pendingBook
		value: Awaited<typeof pendingBook> | null
	}>({ source: pendingBook, value: null })

	useEffect(() => {
		let active = true

		void pendingBook.then((value) => {
			if (active) {
				setResult({ source: pendingBook, value })
			}
		})

		return () => {
			active = false
		}
	}, [pendingBook])

	const value = result.source === pendingBook ? result.value : null
	const book = value?.data
	const loading = !book

	const selectedStore =
		kind === 'store'
			? book?.stores.find((store) => store.slug === slug)
			: undefined

	const enabledStores =
		book?.stores.filter((store) => store.formEnabled) ?? []

	const available =
		book?.organization.formEnabled &&
		(kind === 'store'
			? selectedStore?.formEnabled
			: enabledStores.length > 0)

	return (
		<ComplaintPageLayout
			org={book?.organization}
			storeName={selectedStore?.name}
		>
			{value?.error ? (
				<div role='alert' className='mb-4 space-y-2'>
					<p>{value.error}</p>
					<Button
						variant='outline'
						onClick={() => void revalidator.revalidate()}
					>
						Reintentar
					</Button>
				</div>
			) : null}
			{loading || available ? (
				<ComplaintForm
					key={pathname}
					organizationSlug={book?.organization.slug ?? ''}
					organizationName={book?.organization.name ?? ''}
					stores={kind === 'organization' ? enabledStores : undefined}
					preselectedStore={selectedStore}
					totalStores={book?.stores.length}
					countries={book?.countries ?? []}
					reasons={book?.reasons ?? []}
					turnstileEnabled={book?.turnstileEnabled ?? false}
					turnstileSiteKey={book?.turnstileSiteKey ?? ''}
					loading={loading}
				/>
			) : (
				<FormUnavailableCard description='No existe un formulario de reclamos disponible en este momento.' />
			)}
		</ComplaintPageLayout>
	)
}
