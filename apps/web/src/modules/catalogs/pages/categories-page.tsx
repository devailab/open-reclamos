import {
	MsgDenied,
	MsgInvalidData,
	PermissionAdmin,
} from '@open-reclamos/rpc-client'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	redirect,
} from 'react-router'
import { requireOrganization } from '@/shared/auth/require-session'
import {
	createCategory,
	deleteCategory,
	listCategories,
	updateCategory,
} from '../features/categories/api'
import {
	normalizeCategoriesPagination,
	normalizeCategoriesTableFilters,
} from '../features/categories/validation'

export { CategoriesPage as Component } from '../features/categories/categories-page'

export async function loader({ request }: LoaderFunctionArgs) {
	const { session, signal } = await requireOrganization(request)
	const url = new URL(request.url)

	const pagination = normalizeCategoriesPagination(
		Number(url.searchParams.get('page')),
		Number(url.searchParams.get('pageSize')),
	)

	const filters = normalizeCategoriesTableFilters({
		search: url.searchParams.get('search') ?? '',
	})

	const table = await listCategories({ ...pagination, filters }, signal)

	if (table.page !== pagination.page) {
		url.searchParams.set('page', String(table.page))

		throw redirect(url.pathname + url.search)
	}

	return { ...table, filters, organizationId: session.organization_id }
}

export async function action({ request }: ActionFunctionArgs) {
	const { session, signal } = await requireOrganization(request)

	if (!session.capabilities?.[PermissionAdmin]) {
		throw new Error(MsgDenied)
	}

	const form = await request.formData()

	signal.throwIfAborted()

	const intent = form.get('intent')
	const id = form.get('id')

	try {
		if (
			(intent === 'update' || intent === 'delete') &&
			(typeof id !== 'string' || !id)
		) {
			throw new Error(MsgInvalidData)
		}

		if (intent === 'delete') {
			return {
				...(await deleteCategory(String(id), signal)),
				intent,
			}
		}

		const name = form.get('name')
		const description = form.get('description')

		if (typeof name !== 'string' || typeof description !== 'string') {
			throw new Error(MsgInvalidData)
		}

		const input = { name, description }

		if (intent === 'create') {
			return { ...(await createCategory(input, signal)), intent }
		}

		if (intent === 'update') {
			return {
				...(await updateCategory({ ...input, id: String(id) }, signal)),
				intent,
			}
		}

		throw new Error(MsgInvalidData)
	} catch (error) {
		signal.throwIfAborted()

		return {
			error: error instanceof Error ? error.message : MsgInvalidData,
			intent,
		}
	}
}
