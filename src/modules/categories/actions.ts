'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/database/database'
import { complaintCategories } from '@/database/schema'
import { requireAccess } from '@/modules/shared/access'
import { MESSAGES } from '@/modules/shared/messages'
import type { ActionResult } from '@/modules/shared/types'
import {
	type ComplaintCategoryRow,
	getCategoriesTableForOrganization,
} from './queries'
import {
	type CategoriesTableFilters,
	type CategoryMutationInput,
	normalizeCategoriesPagination,
	normalizeCategoriesTableFilters,
	normalizeCategoryMutationInput,
	validateCategoryMutationInput,
} from './validation'

export interface GetCategoriesTableActionInput {
	page: number
	pageSize: number
	filters?: Partial<CategoriesTableFilters>
}

export interface GetCategoriesTableActionResult {
	rows: ComplaintCategoryRow[]
	totalItems: number
	page: number
	pageSize: number
	filters: CategoriesTableFilters
}

export async function $getCategoriesTableAction(
	input: GetCategoriesTableActionInput,
): Promise<GetCategoriesTableActionResult> {
	const access = await requireAccess('categories.view')
	const { page, pageSize } = normalizeCategoriesPagination(
		input.page,
		input.pageSize,
	)
	const filters = normalizeCategoriesTableFilters(input.filters)

	if ('error' in access) {
		return { rows: [], totalItems: 0, page, pageSize, filters }
	}

	const { rows, totalItems } = await getCategoriesTableForOrganization({
		organizationId: access.membership.organizationId,
		page,
		pageSize,
		filters,
	})

	return { rows, totalItems, page, pageSize, filters }
}

export async function $createCategoryAction(
	input: CategoryMutationInput,
): Promise<ActionResult> {
	const access = await requireAccess('categories.manage')
	if ('error' in access) return { error: access.error }

	const normalizedInput = normalizeCategoryMutationInput(input)
	const validationError = validateCategoryMutationInput(normalizedInput)
	if (validationError) return { error: validationError }

	const [duplicate] = await db
		.select({ id: complaintCategories.id })
		.from(complaintCategories)
		.where(
			and(
				eq(
					complaintCategories.organizationId,
					access.membership.organizationId,
				),
				eq(complaintCategories.name, normalizedInput.name),
			),
		)
		.limit(1)
	if (duplicate) {
		return { error: MESSAGES.categories.duplicateName }
	}

	await db.insert(complaintCategories).values({
		organizationId: access.membership.organizationId,
		name: normalizedInput.name,
		description: normalizedInput.description,
		createdBy: access.session.user.id,
	})

	revalidatePath('/dashboard/categories')
	return { success: true }
}

export async function $updateCategoryAction(input: {
	id: string
	name: string
	description: string | null
}): Promise<ActionResult> {
	const access = await requireAccess('categories.manage')
	if ('error' in access) return { error: access.error }

	const normalizedInput = normalizeCategoryMutationInput(input)
	const validationError = validateCategoryMutationInput(normalizedInput)
	if (validationError) return { error: validationError }

	const [existing] = await db
		.select({ id: complaintCategories.id })
		.from(complaintCategories)
		.where(
			and(
				eq(complaintCategories.id, input.id),
				eq(
					complaintCategories.organizationId,
					access.membership.organizationId,
				),
			),
		)
		.limit(1)
	if (!existing) return { error: MESSAGES.categories.notFound }

	const [duplicate] = await db
		.select({ id: complaintCategories.id })
		.from(complaintCategories)
		.where(
			and(
				eq(
					complaintCategories.organizationId,
					access.membership.organizationId,
				),
				eq(complaintCategories.name, normalizedInput.name),
			),
		)
		.limit(1)
	if (duplicate && duplicate.id !== input.id) {
		return { error: MESSAGES.categories.duplicateName }
	}

	await db
		.update(complaintCategories)
		.set({
			name: normalizedInput.name,
			description: normalizedInput.description,
			updatedAt: new Date(),
			updatedBy: access.session.user.id,
		})
		.where(
			and(
				eq(complaintCategories.id, input.id),
				eq(
					complaintCategories.organizationId,
					access.membership.organizationId,
				),
			),
		)

	revalidatePath('/dashboard/categories')
	return { success: true }
}

export async function $deleteCategoryAction(id: string): Promise<ActionResult> {
	const access = await requireAccess('categories.manage')
	if ('error' in access) return { error: access.error }

	const [existing] = await db
		.select({ id: complaintCategories.id })
		.from(complaintCategories)
		.where(
			and(
				eq(complaintCategories.id, id),
				eq(
					complaintCategories.organizationId,
					access.membership.organizationId,
				),
			),
		)
		.limit(1)
	if (!existing) return { error: MESSAGES.categories.notFound }

	await db
		.delete(complaintCategories)
		.where(
			and(
				eq(complaintCategories.id, id),
				eq(
					complaintCategories.organizationId,
					access.membership.organizationId,
				),
			),
		)

	revalidatePath('/dashboard/categories')
	return { success: true }
}
