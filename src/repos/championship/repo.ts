import { ChampionshipStats, ChampionshipStats as StatType } from './entity'

import * as fs from 'fs/promises'
import * as path from 'path'
import { fileExists, verboseLog } from '../../utils'

export interface ChampionshipStat {
	wins: number
	losses: number
	'win over': string
	'loss over': string
}

/**
 * A repository for retrieving the current championship stats for a given team.
 */
export class ChampionshipRepo {
	// private static championshipStat: ChampionshipStats

	private async getTeamResults(team: string): Promise<ChampionshipStats | undefined> {
		const championshipPath = path.join(__filename, '../../../../', 'championship-cached/')
		const filename = `${team}.json`
		const filePath = path.join(championshipPath, filename)

		const statAlreadyExists = await fileExists(filePath)

		if (statAlreadyExists) {
			const file = await fs.readFile(filePath, 'utf-8')
			verboseLog('returning cached results for', team)
			const stat = JSON.parse(file) as ChampionshipStat
			return new ChampionshipStats(team, stat)
		}

		return
	}

	public async findTeamsResults(teams: string[]): Promise<ChampionshipStats[]> {
		const team0Stats = await this.getTeamResults(teams[0]!)
		const team1Stats = await this.getTeamResults(teams[1]!)

		let championshipTeamResults = []

		if (team0Stats) championshipTeamResults.push(team0Stats)
		if (team1Stats) championshipTeamResults.push(team1Stats)

		return championshipTeamResults
	}
}
