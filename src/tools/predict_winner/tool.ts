import * as fs from 'fs/promises'
import * as path from 'path'
import { fileExists, llm } from '../../utils'
import { SYSTEM_PROMPT } from './prompt'
import { SCHEMA } from './schema'
import { ChampionshipStat, Match } from '../../repos'

let winners = ''

/**
 * Predict the winner of a match.
 *
 * @param match The match to predict the winner of.
 * @returns The name of the winning team.
 */
export async function predictWinner(match: Match, cacheResponse = true): Promise<string> {
	const articles = await match.articles()
	const stats = await match.stats()

	const matchHistory = await match.matchHistory()

	const championshipStats = await match.championshipStats()

	const systemPrompt = SYSTEM_PROMPT(stats, match, articles, matchHistory, championshipStats, 'challenger')
	const response = await llm(systemPrompt, match, SCHEMA)

	if (cacheResponse) {
		const matchesPath = path.join(__filename, '../../../../', 'matches-cached/')
		const filename = `${match.home}-${match.away}.json`
		const filePath = path.join(matchesPath, filename)
		await fs.mkdir(matchesPath, { recursive: true })
		await fs.writeFile(filePath, JSON.stringify(response), 'utf-8')
	}

	// cache response in championship
	const championshipPath = path.join(__filename, '../../../../', 'championship-cached/')
	await fs.mkdir(championshipPath, { recursive: true })

	const winTeamFile = `${response.winningTeam}.json`
	const winTeamPath = path.join(championshipPath, winTeamFile)
	const winnerStatExists = await fileExists(winTeamPath)
	if (winnerStatExists) {
		const file = await fs.readFile(winTeamPath, 'utf-8')
		const stat = JSON.parse(file) as ChampionshipStat

		stat.wins += 1

		if (stat['win over'] === '') {
			stat['win over'] = response.losingTeam
		} else {
			stat['win over'] += `, ${response.losingTeam}`
		}

		await fs.writeFile(winTeamPath, JSON.stringify(stat), 'utf-8')
	} else {
		const stat: ChampionshipStat = {
			wins: 1,
			losses: 0,
			'win over': response.losingTeam,
			'loss over': '',
		}
		await fs.writeFile(winTeamPath, JSON.stringify(stat), 'utf-8')
	}

	const loserTeamFile = `${response.losingTeam}.json`
	const loserTeamPath = path.join(championshipPath, loserTeamFile)
	const loserStatExists = await fileExists(loserTeamPath)
	if (loserStatExists) {
		const file = await fs.readFile(loserTeamPath, 'utf-8')
		const stat = JSON.parse(file) as ChampionshipStat

		stat.losses += 1

		if (stat['loss over'] === '') {
			stat['loss over'] = response.winningTeam
		} else {
			stat['loss over'] += `, ${response.winningTeam}`
		}
		await fs.writeFile(loserTeamPath, JSON.stringify(stat), 'utf-8')
	} else {
		const stat: ChampionshipStat = {
			wins: 0,
			losses: 1,
			'win over': '',
			'loss over': response.winningTeam,
		}
		await fs.writeFile(loserTeamPath, JSON.stringify(stat), 'utf-8')
	}

	winners += ` ${response.winningTeam} -`
	console.log('WINNERS', winners)

	return response.winningTeam
}
