import type { LanguageModelV3GenerateResult } from '@ai-sdk/provider'
import { MockLanguageModelV3 } from 'ai/test'
import { describe, expect, it } from 'vitest'
import {
	type ComplaintClassificationContext,
	type ComplaintExistingTag,
	classifyComplaintCore,
} from './ai-classification'

const BASE_COMPLAINT: ComplaintClassificationContext = {
	reasonLabel: 'Cobro indebido',
	type: 'claim',
	personType: 'natural',
	isMinor: false,
	itemType: 'service',
	itemDescription: 'Plan de internet hogar',
	amount: '199.90',
	currency: 'PEN',
	incidentDate: '2026-04-01T10:00:00.000Z',
	description:
		'Me cobraron un monto mayor al informado y no respondieron en el canal de soporte.',
	request: 'Solicito devolución y regularización del cobro.',
}

function createGenerateResult(output: unknown): LanguageModelV3GenerateResult {
	return {
		content: [{ type: 'text', text: JSON.stringify(output) }],
		finishReason: {
			unified: 'stop',
			raw: 'stop',
		},
		usage: {
			inputTokens: {
				total: 100,
				noCache: 100,
				cacheRead: 0,
				cacheWrite: 0,
			},
			outputTokens: {
				total: 40,
				text: 40,
				reasoning: 0,
			},
		},
		warnings: [],
	}
}

function createModel(output: unknown) {
	return new MockLanguageModelV3({
		doGenerate: createGenerateResult(output),
	})
}

describe('classifyComplaintCore', () => {
	it('reuses existing tags when the model suggests equivalent names', async () => {
		const existingTags: ComplaintExistingTag[] = [
			{ id: 'tag-1', name: 'Reembolso', color: '#2563eb' },
			{ id: 'tag-2', name: 'Demora', color: '#f59e0b' },
		]

		const result = await classifyComplaintCore(
			{
				complaint: BASE_COMPLAINT,
				existingTags,
			},
			{
				model: createModel({
					priority: 'high',
					summary:
						'La consumidora reporta un cobro mayor al informado en su plan de internet y no obtuvo respuesta del soporte. Solicita devolución y regularización del cobro.',
					priorityReason:
						'Existe afectacion economica y falta de respuesta del canal.',
					tags: [
						{
							name: 'reembolso',
							reason: 'El consumidor solicita devolucion.',
						},
						{
							name: 'demora',
							reason: 'No obtuvo respuesta oportuna.',
						},
					],
				}),
			},
		)

		expect(result.priority).toBe('high')
		expect(result.summary).toBe(
			'La consumidora reporta un cobro mayor al informado en su plan de internet y no obtuvo respuesta del soporte. Solicita devolución y regularización del cobro.',
		)
		expect(result.tags).toEqual([
			{
				name: 'Reembolso',
				reason: 'El consumidor solicita devolucion.',
				existingTagId: 'tag-1',
				color: '#2563eb',
			},
			{
				name: 'Demora',
				reason: 'No obtuvo respuesta oportuna.',
				existingTagId: 'tag-2',
				color: '#f59e0b',
			},
		])
	})

	it('limits tags to 3 and removes duplicates after normalization', async () => {
		const result = await classifyComplaintCore(
			{
				complaint: BASE_COMPLAINT,
				existingTags: [],
			},
			{
				model: createModel({
					priority: 'urgent',
					summary:
						'El reclamo muestra indicios de cobro crítico e irregular. La consumidora necesita atención inmediata y revisión del posible fraude.',
					priorityReason: 'Hay riesgo de cobro critico y fraude.',
					tags: [
						{
							name: 'Cobro indebido',
							reason: 'Se reporta un cobro no esperado.',
						},
						{
							name: 'cobro  indebido',
							reason: 'Duplicado semantico.',
						},
						{
							name: 'Fraude',
							reason: 'El consumidor sospecha un cargo irregular.',
						},
						{
							name: 'Mala atención',
							reason: 'No hubo soporte adecuado.',
						},
					],
				}),
			},
		)

		expect(result.priority).toBe('urgent')
		expect(result.tags).toEqual([
			{
				name: 'cobro-indebido',
				reason: 'Se reporta un cobro no esperado.',
				existingTagId: undefined,
				color: null,
			},
			{
				name: 'fraude',
				reason: 'El consumidor sospecha un cargo irregular.',
				existingTagId: undefined,
				color: null,
			},
		])
	})

	it('returns only one tag for short complaints', async () => {
		const result = await classifyComplaintCore(
			{
				complaint: {
					...BASE_COMPLAINT,
					reasonLabel: null,
					itemDescription: 'Recibo duplicado',
					description: 'Me cobraron dos veces.',
					request: 'Devolucion.',
				},
				existingTags: [],
			},
			{
				model: createModel({
					priority: 'medium',
					summary:
						'La consumidora reporta un doble cobro en un caso acotado. Solicita devolución sin señales claras de urgencia mayor.',
					priorityReason:
						'Hay un cobro incorrecto pero sin senales de urgencia.',
					tags: [
						{
							name: 'cobro indebido',
							reason: 'Existe un doble cobro.',
						},
						{
							name: 'reembolso',
							reason: 'Solicita devolucion.',
						},
					],
				}),
			},
		)

		expect(result.tags).toEqual([
			{
				name: 'cobro-indebido',
				reason: 'Existe un doble cobro.',
				existingTagId: undefined,
				color: null,
			},
		])
	})

	it('fails when the model returns an invalid structured output', async () => {
		await expect(
			classifyComplaintCore(
				{
					complaint: BASE_COMPLAINT,
					existingTags: [],
				},
				{
					model: createModel({
						priority: 'critical',
						summary: '',
						priorityReason: '',
						tags: [],
					}),
				},
			),
		).rejects.toThrow()
	})
})
