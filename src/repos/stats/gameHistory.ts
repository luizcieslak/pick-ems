import { Table } from 'utils'

export interface MatchHistory {
	'Higher seed team': string
	'Lower seed team': string
	'Winner of the match': string
	Event: string
}

// this should be inside a class like the other toTable
export function toTable(matchHistory: MatchHistory[]): Table {
	const headers: string[] = ['Higher seed team', 'Lower seed team', 'Winner of the match', 'Event']
	const body: string[][] = []

	for (const history of matchHistory) {
		body.push(Object.values(history) as string[])
	}

	return { headers, body: body }
}
