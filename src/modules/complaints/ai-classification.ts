import type { LanguageModel } from 'ai'
import { generateText, NoOutputGeneratedError, Output } from 'ai'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/database/database'
import {
	complaintCategories,
	complaintDetails,
	complaintReasons,
	complaints,
} from '@/database/schema'
import { inngest } from '@/lib/inngest'
import { getComplaintCategoriesForOrganization } from '@/modules/categories/queries'

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface ComplaintClassificationEventData {
	complaintId: string
	organizationId: string
}

export interface ComplaintClassificationContext {
	reasonLabel: string | null
	type: string
	personType: string
	isMinor: boolean
	itemType: string | null
	itemDescription: string | null
	amount: string | null
	currency: string | null
	incidentDate: string | null
	description: string | null
	request: string | null
}

export interface ComplaintExistingCategory {
	id: string
	name: string
	description: string | null
}

export interface ComplaintClassificationResult {
	priority: ComplaintPriority
	summary: string
	categoryId: string | null
}

const COMPLAINT_AI_CLASSIFICATION_SCHEMA = z.object({
	priority: z
		.enum(['low', 'medium', 'high', 'urgent'])
		.describe(
			'Operational priority for the complaint. Use medium when there is not enough evidence to raise or lower priority.',
		),
	summary: z
		.string()
		.trim()
		.min(1)
		.max(600)
		.describe(
			'Internal Spanish summary for operators. Explain what happened, the main impact, and what the consumer is requesting in 2 to 4 concise sentences.',
		),
	categoryId: z
		.string()
		.trim()
		.nullable()
		.describe(
			'ID of the best matching complaint category from the provided list. Return null only when none fits clearly.',
		),
})

const COMPLAINT_AI_CLASSIFICATION_EVENT =
	'app/complaints.ai-classification.requested'
const MIN_DESCRIPTION_WORDS_FOR_AI_SUMMARY = 51

function formatComplaintType(type: string) {
	return type === 'claim' ? 'Reclamo' : 'Queja'
}

function formatItemType(itemType: string | null) {
	if (itemType === 'product') return 'Producto'
	if (itemType === 'service') return 'Servicio'
	return 'No especificado'
}

function formatConsumerProfile(params: {
	personType: string
	isMinor: boolean
}) {
	if (params.isMinor) return 'Menor de edad'
	if (params.personType === 'legal') return 'Persona jurídica'
	if (params.personType === 'natural') return 'Persona natural'
	return 'No especificado'
}

function formatDateForPrompt(value: string | null) {
	if (!value) return 'No especificada'
	return value
}

function cleanText(value: string | null | undefined) {
	if (!value) return 'No especificado'

	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : 'No especificado'
}

export function countWords(value: string | null | undefined) {
	if (!value) return 0

	return value.trim().split(/\s+/).filter(Boolean).length
}

export function shouldRunComplaintAiClassification(
	description: string | null | undefined,
) {
	return countWords(description) >= MIN_DESCRIPTION_WORDS_FOR_AI_SUMMARY
}

function buildComplaintClassificationPrompt(params: {
	complaint: ComplaintClassificationContext
	existingCategories: ComplaintExistingCategory[]
	aiOrganizationContext?: string | null
}) {
	const { complaint, existingCategories } = params
	const organizationContext = params.aiOrganizationContext?.trim() || null
	const categoriesLabel =
		existingCategories.length > 0
			? existingCategories
					.map(
						(category) =>
							`- ${category.id}: ${category.name}${category.description?.trim() ? ` | ${category.description.trim()}` : ''}`,
					)
					.join('\n')
			: '- No categories available.'
	const organizationContextSection = organizationContext
		? `

Organization context:
- Use this additional business context only when it helps interpret the complaint more accurately.
- Do not override the complaint facts with this context.
- Context: ${organizationContext}
`
		: ''

	return `
Classify the following consumer complaint for a company in Peru.

Goals:
1. Set the operational priority: low | medium | high | urgent.
2. Write a concise internal summary in Spanish for operators.
3. Choose exactly one existing category when there is a clear fit.

Priority rules:
- Default to medium when evidence is not strong enough.
- Use low only for simple, contained, low-impact cases.
- Use high for meaningful consumer impact, reputational risk, likely escalation, vulnerable consumers, or relevant financial impact.
- Use urgent only for severe situations such as safety, fraud, critical charges, minors, serious legal exposure, or cases requiring immediate attention.

Summary rules:
- Write the summary in Spanish.
- Keep it practical and internal-facing.
- Mention the core incident, the main effect on the consumer, and the requested resolution.
- Do not invent facts that are not present in the complaint.
- Keep it concise: usually 2 to 4 sentences, maximum 600 characters.

Category rules:
- You may only choose a category ID from the provided list.
- Prefer the closest business category, not the consumer-facing reason label.
- Return null if no category is a clear match.
- Do not invent new categories.

Privacy rules:
- Personal identifiers are intentionally omitted.
- Do not infer, reconstruct, or mention names, document numbers, emails, phone numbers, or addresses.
- Base the classification only on the operational facts provided below.

Existing categories:
${categoriesLabel}
${organizationContextSection}

Complaint data:
- Type: ${formatComplaintType(complaint.type)}
- Reason: ${cleanText(complaint.reasonLabel)}
- Consumer profile: ${formatConsumerProfile({
		personType: complaint.personType,
		isMinor: complaint.isMinor,
	})}
- Item description: ${cleanText(complaint.itemDescription)}
- Item type: ${formatItemType(complaint.itemType)}
- Amount: ${complaint.amount ? `${complaint.currency ?? ''} ${complaint.amount}`.trim() : 'No especificado'}
- Incident date: ${formatDateForPrompt(complaint.incidentDate)}
- Description: ${cleanText(complaint.description)}
- Consumer request: ${cleanText(complaint.request)}
`.trim()
}

export async function classifyComplaintCore(
	params: {
		complaint: ComplaintClassificationContext
		existingCategories: ComplaintExistingCategory[]
		aiOrganizationContext?: string | null
	},
	deps: {
		model: LanguageModel
	},
): Promise<ComplaintClassificationResult> {
	const validCategoryIds = new Set(
		params.existingCategories.map((category) => category.id),
	)
	const output = Output.object({
		schema: COMPLAINT_AI_CLASSIFICATION_SCHEMA,
		name: 'complaint_classification',
		description:
			'Structured classification of priority and category for a complaint.',
	})
	const result = await generateText({
		model: deps.model,
		system: 'You are a senior operations analyst specialized in consumer complaints. Respond only with structured data and prioritize consistency, caution, and operational usefulness.',
		prompt: buildComplaintClassificationPrompt(params),
		temperature: 0,
		maxOutputTokens: 300,
		output,
	})
	let structuredOutput: z.infer<typeof COMPLAINT_AI_CLASSIFICATION_SCHEMA>

	try {
		structuredOutput = result.output
	} catch (error) {
		if (!NoOutputGeneratedError.isInstance(error)) {
			throw error
		}

		structuredOutput = COMPLAINT_AI_CLASSIFICATION_SCHEMA.parse(
			JSON.parse(result.text),
		)
	}

	return {
		priority: structuredOutput.priority,
		summary: structuredOutput.summary.trim(),
		categoryId:
			structuredOutput.categoryId &&
			validCategoryIds.has(structuredOutput.categoryId)
				? structuredOutput.categoryId
				: null,
	}
}

export async function getComplaintClassificationContext(params: {
	complaintId: string
	organizationId: string
}) {
	const [complaintRows, existingCategories] = await Promise.all([
		db
			.select({
				reasonLabel: complaintReasons.reason,
				type: complaints.type,
				personType: complaints.personType,
				isMinor: complaints.isMinor,
				itemType: complaints.itemType,
				itemDescription: complaints.itemDescription,
				amount: complaints.amount,
				currency: complaints.currency,
				incidentDate: complaints.incidentDate,
				description: complaints.description,
				request: complaints.request,
			})
			.from(complaints)
			.leftJoin(
				complaintReasons,
				eq(complaints.reasonId, complaintReasons.id),
			)
			.where(
				and(
					eq(complaints.id, params.complaintId),
					eq(complaints.organizationId, params.organizationId),
				),
			)
			.limit(1),
		getComplaintCategoriesForOrganization(params.organizationId),
	])
	const [complaint] = complaintRows

	if (!complaint) {
		return null
	}

	return {
		complaint: {
			...complaint,
			incidentDate: complaint.incidentDate?.toISOString() ?? null,
		},
		existingCategories,
	}
}

export async function applyComplaintClassificationResult(
	params: {
		complaintId: string
		organizationId: string
		classification: ComplaintClassificationResult
	},
	tx?: DbOrTx,
) {
	const executor = tx ?? db
	const now = new Date()

	await executor
		.insert(complaintDetails)
		.values({
			organizationId: params.organizationId,
			complaintId: params.complaintId,
			aiSummary: params.classification.summary,
		})
		.onConflictDoUpdate({
			target: complaintDetails.complaintId,
			set: {
				organizationId: params.organizationId,
				aiSummary: params.classification.summary,
				updatedAt: now,
			},
		})

	const [updatedComplaint] = await executor
		.update(complaints)
		.set({
			priority: params.classification.priority,
			categoryId: params.classification.categoryId,
			updatedAt: now,
			updatedBy: null,
		})
		.where(
			and(
				eq(complaints.id, params.complaintId),
				eq(complaints.organizationId, params.organizationId),
			),
		)
		.returning({ id: complaints.id })

	if (!updatedComplaint) {
		throw new Error('No se pudo actualizar la clasificación del reclamo.')
	}

	if (!params.classification.categoryId) {
		return null
	}

	const [category] = await executor
		.select({
			id: complaintCategories.id,
			name: complaintCategories.name,
			description: complaintCategories.description,
		})
		.from(complaintCategories)
		.where(
			and(
				eq(complaintCategories.id, params.classification.categoryId),
				eq(complaintCategories.organizationId, params.organizationId),
			),
		)
		.limit(1)

	return category ?? null
}

export async function enqueueComplaintAiClassification(
	data: ComplaintClassificationEventData,
) {
	return inngest.send({
		name: COMPLAINT_AI_CLASSIFICATION_EVENT,
		data,
	})
}

export { COMPLAINT_AI_CLASSIFICATION_EVENT }
