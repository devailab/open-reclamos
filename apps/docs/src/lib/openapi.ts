import { createOpenAPI } from 'fumadocs-openapi/server'

// https://fumadocs.dev/docs/integrations/openapi
export const openapi = createOpenAPI({
	input: ['./openapi.yml'],
})
