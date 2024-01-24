import type { FromSchema, JSONSchema } from 'json-schema-to-ts'

const DEFINITION = {
	type: 'object',
	properties: {
		winningTeam: {
			type: 'string',
			description: 'The name of the winning team.',
		},
		analysis: {
			type: 'string',
			description: 'Analysis done by LLM',
		},
	},
	required: ['winningTeam', 'analysis'],
} as const satisfies JSONSchema

export const SCHEMA = {
	schema: DEFINITION,
	type: {} as FromSchema<typeof DEFINITION>,
}
