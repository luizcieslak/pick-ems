import * as fs from 'fs/promises'
import * as path from 'path'
import { llm } from '../../utils'
import { SYSTEM_PROMPT } from './prompt'
import { SCHEMA } from './schema'
import { Match } from '../../repos'

/**
 * Predict the winner of a match.
 *
 * @param match The match to predict the winner of.
 * @returns The name of the winning team.
 */
export async function predictWinner(match: Match, cacheResponse = true): Promise<string> {
	const articles = await match.articles()
	console.log('articles?', articles)
	// 8) get stats
	const stats = await match.stats()
	console.log('stats?', stats)

	// get match history
	const matchHistory = await match.matchHistory()

	const systemPrompt = SYSTEM_PROMPT(stats, match, articles, matchHistory)
	const response = await llm(systemPrompt, match, SCHEMA)

	const matchesPath = path.join(__filename, '../../../../', 'matches-cached/')
	const filename = `${match.home}-${match.away}.json`
	const filePath = path.join(matchesPath, filename)

	if (cacheResponse) {
		console.log(matchesPath)
		await fs.mkdir(matchesPath, { recursive: true })
		await fs.writeFile(filePath, JSON.stringify(response), 'utf-8')
	}

	return response.winningTeam
}
