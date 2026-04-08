import type { LanguageModel } from 'ai'
import { generateText, NoOutputGeneratedError, Output } from 'ai'
import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/database/database'
import {
	complaintDetails,
	complaintReasons,
	complaints,
	complaintTagAssignments,
	complaintTags,
} from '@/database/schema'
import { inngest } from '@/lib/inngest'

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

export interface ComplaintExistingTag {
	id: string
	name: string
	color: string | null
}

export interface ComplaintClassificationTag {
	name: string
	reason: string
	existingTagId?: string
	color?: string | null
}

export interface ComplaintClassificationResult {
	priority: ComplaintPriority
	summary: string
	priorityReason: string
	tags: ComplaintClassificationTag[]
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
	priorityReason: z
		.string()
		.trim()
		.min(1)
		.max(280)
		.describe(
			'Brief explanation in Spanish for why this priority was selected.',
		),
	tags: z
		.array(
			z.object({
				name: z
					.string()
					.trim()
					.min(1)
					.max(32)
					.describe(
						'Short Spanish tag in slug format. Lowercase only, use 0-9, a-z and hyphens, for example: riesgo-legal, cobro-indebido, mala-atencion.',
					),
				reason: z
					.string()
					.trim()
					.min(1)
					.max(180)
					.describe(
						'Brief explanation in Spanish of why this tag applies.',
					),
			}),
		)
		.describe(
			`Suggested tags. Use only highly relevant tags, never filler tags, and return fewer tags when evidence is weak.`,
		),
})

const COMPLAINT_AI_CLASSIFICATION_EVENT =
	'app/complaints.ai-classification.requested'

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

export function normalizeComplaintTagName(name: string) {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.replace(/-{2,}/g, '-')
		.trim()
}

function getComplaintClassificationSignal(
	complaint: ComplaintClassificationContext,
) {
	const signalText = [
		complaint.reasonLabel,
		complaint.itemDescription,
		complaint.description,
		complaint.request,
	]
		.filter((value) => value && value.trim().length > 0)
		.join(' ')

	const contentLength = signalText.trim().length

	if (contentLength === 0) {
		return { contentLength, contentLevel: 'short', maxTags: 0 as const }
	}

	if (contentLength <= 140) {
		return { contentLength, contentLevel: 'short', maxTags: 1 as const }
	}

	if (contentLength <= 320) {
		return { contentLength, contentLevel: 'medium', maxTags: 2 as const }
	}

	return { contentLength, contentLevel: 'long', maxTags: 3 as const }
}

function dedupeClassificationTags(
	tags: ComplaintClassificationTag[],
	existingTags: ComplaintExistingTag[],
	maxTags: number,
) {
	const existingTagsByNormalizedName = new Map(
		existingTags.map((tag) => [normalizeComplaintTagName(tag.name), tag]),
	)
	const seenNames = new Set<string>()
	const normalizedTags: ComplaintClassificationTag[] = []

	if (maxTags <= 0) {
		return normalizedTags
	}

	for (const tag of tags) {
		const normalizedName = normalizeComplaintTagName(tag.name)
		if (!normalizedName || seenNames.has(normalizedName)) {
			continue
		}

		const existingTag = existingTagsByNormalizedName.get(normalizedName)
		const nextTag: ComplaintClassificationTag = {
			name: existingTag?.name ?? normalizedName,
			reason: tag.reason.trim(),
			existingTagId: existingTag?.id,
			color: existingTag?.color ?? null,
		}

		if (!nextTag.name || !nextTag.reason) {
			continue
		}

		seenNames.add(normalizedName)
		normalizedTags.push(nextTag)

		if (normalizedTags.length >= maxTags) {
			break
		}
	}

	return normalizedTags
}

function buildComplaintClassificationPrompt(params: {
	complaint: ComplaintClassificationContext
	existingTags: ComplaintExistingTag[]
}) {
	const { complaint, existingTags } = params
	const classificationSignal = getComplaintClassificationSignal(complaint)
	const existingTagsLabel =
		existingTags.length > 0
			? existingTags.map((tag) => `- ${tag.name}`).join('\n')
			: '- No existen tags previos en esta organización.'

	return `
Classify the following consumer complaint for a company in Peru.

Goals:
1. Set the operational priority: low | medium | high | urgent.
2. Write a concise internal summary in Spanish for operators.
3. Suggest only the most relevant tags in Spanish.

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

Privacy rules:
- Personal identifiers are intentionally omitted.
- Do not infer, reconstruct, or mention names, document numbers, emails, phone numbers, or addresses.
- Base the classification only on the operational facts provided below.

Tag rules:
- Tags must be written in Spanish, but the prompt instructions are in English.
- Tags must use slug format only: lowercase letters, numbers, and hyphens.
- Valid examples: riesgo-legal, cobro-indebido, fraude, mala-atencion, incumplimiento-contractual.
- Invalid examples: "riesgo legal", "servicio digital", "cliente", "soporte", "reclamo".
- Tags must be short, specific, and operationally useful.
- Use only tags that are truly important or closely related to the complaint.
- Do not add filler tags just to reach a number.
- Reuse the exact existing tag name when it is semantically equivalent.
- Return 0 tags if there is no tag that adds real value.
- Never return more than ${classificationSignal.maxTags} tags for this complaint.

Tag count policy for this complaint:
- Content density detected: ${classificationSignal.contentLevel}.
- Approximate content length: ${classificationSignal.contentLength} characters.
- Target tag count:
  - short content -> 1 important tag maximum
  - medium content -> 2 important tags maximum
  - long content -> 3 important tags maximum
- For this complaint specifically, do not exceed ${classificationSignal.maxTags} tags.

Existing organization tags:
${existingTagsLabel}

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
		existingTags: ComplaintExistingTag[]
	},
	deps: {
		model: LanguageModel
	},
): Promise<ComplaintClassificationResult> {
	const classificationSignal = getComplaintClassificationSignal(
		params.complaint,
	)
	const output = Output.object({
		schema: COMPLAINT_AI_CLASSIFICATION_SCHEMA,
		name: 'complaint_classification',
		description:
			'Clasificacion estructurada de prioridad y tags para un reclamo.',
	})
	const result = await generateText({
		model: deps.model,
		system: 'Eres un analista senior de operaciones especializado en reclamos de consumidores. Responde solo con datos estructurados y prioriza consistencia, cautela y utilidad operativa.',
		prompt: buildComplaintClassificationPrompt(params),
		temperature: 0,
		maxOutputTokens: 400,
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
		priorityReason: structuredOutput.priorityReason.trim(),
		tags: dedupeClassificationTags(
			structuredOutput.tags,
			params.existingTags,
			classificationSignal.maxTags,
		),
	}
}

export async function getComplaintClassificationContext(params: {
	complaintId: string
	organizationId: string
}) {
	const [complaintRows, existingTags] = await Promise.all([
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
		getComplaintTagsForOrganization(params.organizationId),
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
		existingTags,
	}
}

export async function getComplaintTagsForOrganization(organizationId: string) {
	return db
		.select({
			id: complaintTags.id,
			name: complaintTags.name,
			color: complaintTags.color,
		})
		.from(complaintTags)
		.where(eq(complaintTags.organizationId, organizationId))
		.orderBy(complaintTags.name)
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
			aiPriorityReason: params.classification.priorityReason,
		})
		.onConflictDoUpdate({
			target: complaintDetails.complaintId,
			set: {
				organizationId: params.organizationId,
				aiSummary: params.classification.summary,
				aiPriorityReason: params.classification.priorityReason,
				updatedAt: now,
			},
		})

	const [updatedComplaint] = await executor
		.update(complaints)
		.set({
			priority: params.classification.priority,
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
		throw new Error('No se pudo actualizar la prioridad del reclamo.')
	}

	if (params.classification.tags.length === 0) {
		return []
	}

	const tagNames = params.classification.tags.map((tag) => tag.name)
	const existingTags = await executor
		.select({
			id: complaintTags.id,
			name: complaintTags.name,
			color: complaintTags.color,
		})
		.from(complaintTags)
		.where(
			and(
				eq(complaintTags.organizationId, params.organizationId),
				inArray(complaintTags.name, tagNames),
			),
		)

	const existingTagNames = new Set(existingTags.map((tag) => tag.name))
	const missingTags = params.classification.tags.filter(
		(tag) => !existingTagNames.has(tag.name),
	)

	if (missingTags.length > 0) {
		await executor
			.insert(complaintTags)
			.values(
				missingTags.map((tag) => ({
					organizationId: params.organizationId,
					name: tag.name,
					description: tag.reason,
					color: null,
					createdBy: null,
					updatedAt: now,
					updatedBy: null,
				})),
			)
			.onConflictDoNothing()
	}

	const resolvedTags = await executor
		.select({
			id: complaintTags.id,
			name: complaintTags.name,
			color: complaintTags.color,
		})
		.from(complaintTags)
		.where(
			and(
				eq(complaintTags.organizationId, params.organizationId),
				inArray(complaintTags.name, tagNames),
			),
		)

	if (resolvedTags.length === 0) {
		return []
	}

	await executor
		.insert(complaintTagAssignments)
		.values(
			resolvedTags.map((tag) => ({
				complaintId: params.complaintId,
				tagId: tag.id,
				createdBy: null,
			})),
		)
		.onConflictDoNothing()

	return resolvedTags
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
