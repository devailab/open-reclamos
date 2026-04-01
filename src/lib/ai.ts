import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'

const AI_PROVIDER = process.env.AI_PROVIDER?.trim().toUpperCase() ?? 'OPENAI'
const AI_OPENAI_API_KEY = process.env.AI_OPENAI_API_KEY?.trim() ?? ''
const AI_OPENAI_MODEL = process.env.AI_OPENAI_MODEL?.trim() ?? 'gpt-5.4-mini'
const openai = createOpenAI({
	apiKey: AI_OPENAI_API_KEY,
})

export function isAiClassificationConfigured() {
	if (AI_PROVIDER !== 'OPENAI') {
		return false
	}

	return AI_OPENAI_API_KEY.length > 0 && AI_OPENAI_MODEL.length > 0
}

export function getComplaintClassificationModel(): LanguageModel {
	if (AI_PROVIDER !== 'OPENAI') {
		throw new Error(`Proveedor de IA no soportado: ${AI_PROVIDER}.`)
	}

	if (!AI_OPENAI_API_KEY) {
		throw new Error(
			'La variable AI_OPENAI_API_KEY es requerida para usar OpenAI.',
		)
	}

	return openai(AI_OPENAI_MODEL)
}

export function getAiClassificationModelId() {
	return AI_OPENAI_MODEL
}
