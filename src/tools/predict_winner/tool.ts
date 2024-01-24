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
export async function predictWinner(match: Match): Promise<string> {
	const articles = await match.articles()
	console.log('articles?', articles)
	// 8) get stats
	const stats = await match.stats()
	console.log('stats?', stats)

	// get match history
	const matchHistory = await match.matchHistory()

	const systemPrompt = SYSTEM_PROMPT(stats, match, articles, matchHistory)
	const response = await llm(systemPrompt, match, SCHEMA)

	return response.winningTeam
}
