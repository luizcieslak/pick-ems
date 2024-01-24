import type { FromSchema, JSONSchema } from 'json-schema-to-ts'

const DEFINITION = {
	type: 'object',
	properties: {
		// primaryTeam: {
		// 	type: 'string',
		// 	description: 'The primary team associated with the article.',
		// },
		summary: {
			type: 'string',
			description: 'The summary of the article.',
		},
		analysis: {
			type: 'string',
			description: 'Analysis done by LLM',
		},
	},
	required: ['summary', 'analysis'],
} as const satisfies JSONSchema

export const SCHEMA = {
	schema: DEFINITION,
	type: {} as FromSchema<typeof DEFINITION>,
}
