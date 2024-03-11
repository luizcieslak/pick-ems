import { fileExists, navigateTo, verboseLog } from '../../utils'
import { TeamStats, TeamStatType as StatType, TeamStatType } from './entity'
import { MatchHistory } from './gameHistory'

import * as fs from 'fs/promises'
import * as path from 'path'

const WAIT_FOR = '.contentCol'

const BASE_URL_SEARCH = 'https://www.hltv.org/search'
const SELECTOR_SEARCH = 'td a[href^="/team"]'

const saveStat = async (stat: TeamStats) => {
	const statPath = path.join(__filename, '../../../../', 'stats-cached/')
	const filename = `${stat.team}-${stat.type}.json`
	const filePath = path.join(statPath, filename)

	await fs.mkdir(statPath, { recursive: true })
	await fs.writeFile(filePath, JSON.stringify(stat), 'utf-8')
}

const getCachedStat = async (team: string, type: StatType): Promise<TeamStats | undefined> => {
	const statPath = path.join(__filename, '../../../../', 'stats-cached/')
	const filename = `${team}-${type}.json`
	const filePath = path.join(statPath, filename)

	const exists = await fileExists(filePath)

	if (!exists) return

	const file = await fs.readFile(filePath, 'utf-8')
	verboseLog('returning cached stat for', team, type)
	const parsed = JSON.parse(file) as TeamStats
	return new TeamStats(parsed.team, parsed.type, parsed.stats)
}

/**
 * A repository for retrieving historical stats for each team across
 * KDA ratio and win rate.
 */
export class TeamStatsRepo {
	private async getTeamStatsPage(team: string): Promise<string | null> {
		const locator = await navigateTo(`${BASE_URL_SEARCH}?query=${team}`, WAIT_FOR)
		const headlines = await locator.locator(SELECTOR_SEARCH).all()
		const hrefs = await Promise.all(headlines.map(async headline => headline.getAttribute('href')))

		if (!hrefs[0]) return null

		const statPage = `https://www.hltv.org/stats/teams${hrefs[0].replace(
			'/team',
			''
		)}?startDate=2023-06-18&endDate=2025-01-18`

		return statPage
	}

	private async getTeamPage(team: string): Promise<string | null> {
		const locator = await navigateTo(`${BASE_URL_SEARCH}?query=${team}`, WAIT_FOR)
		const headlines = await locator.locator(SELECTOR_SEARCH).all()
		const hrefs = await Promise.all(headlines.map(async headline => headline.getAttribute('href')))
		return hrefs[0] as string | null
	}

	/**
	 * Scrapes a specific type of stats for all teams.
	 *
	 * @param type The type of stats to scrape. (e.g. offense, defense, etc.)
	 * @returns {Promise<TeamStats[]>} The stats of the given type for all teams.
	 */
	private async fetchTypeByTeam(team: string, type: StatType): Promise<TeamStats | null> {
		if (type === TeamStatType.TEAM_STATS) {
			const statsPage = await this.getTeamStatsPage(team)

			if (!statsPage) {
				throw new Error(`No stats page found for ${team} and ${type}`)
			}

			const page = await navigateTo(statsPage, WAIT_FOR)

			let teamStat: TeamStats | null = null

			const wdl = page.locator('.columns .standard-box .large-strong').nth(1)
			const wdlString = await wdl.textContent()
			const kdRatio = page.locator('.columns .standard-box .large-strong').nth(5)
			const kdRatioString = await kdRatio.textContent()

			if (wdlString && kdRatioString) {
				const [wins, draw, losses] = wdlString?.split(' / ').map(s => parseInt(s))
				// @ts-ignore handle error on these later
				const total = wins + draw + losses
				teamStat = new TeamStats(team, type, {
					// @ts-ignore handle error on these later
					'Win rate': `${(wins / total) * 100}%`,
					// wins, draw, losses,
					'Kill death ratio': kdRatioString,
				})
				saveStat(teamStat)
			}

			return teamStat
		}

		if (type === TeamStatType.WORLD_RANKING) {
			const teamPage = await this.getTeamPage(team)
			const page = await navigateTo(`https://www.hltv.org${teamPage}`, WAIT_FOR)
			const worldRanking = await page.locator('.profile-team-stat').first().locator('.right').textContent()
			if (typeof worldRanking === 'string') {
				const teamStat = new TeamStats(team, type, {
					'World Ranking': worldRanking,
				})
				saveStat(teamStat)
				return teamStat
			}
		}

		if (type === TeamStatType.EVENT_HISTORY) {
			const statsPage = await this.getTeamStatsPage(team)
			if (!statsPage) {
				throw new Error(`No stats page found for ${team} and ${type}`)
			}
			const eventsPage = statsPage.replace('/teams/', '/teams/events/')
			const page = await navigateTo(eventsPage, WAIT_FOR)

			// header + first 10 rows of the table
			const tableRows = await page.locator('table.stats-table tbody tr').all()

			const eventHistoryObj: Record<string, string> = {}

			for await (const tr of tableRows) {
				const row = await tr.locator('td').all()
				if (row.length === 0) continue

				const pos = await row[0]?.textContent()
				const eventName = await row[1]?.textContent()

				if (typeof pos === 'string' && typeof eventName === 'string' && pos !== '-') {
					eventHistoryObj[eventName] = pos
				}
			}

			const teamStat = new TeamStats(team, type, eventHistoryObj)
			saveStat(teamStat)

			return teamStat
		}

		return null
	}

	/**
	 * Retrieve stats for the given team and stat type.
	 *
	 * @param team The team to retrieve stats for.
	 * @param type The type of stats to retrieve.
	 * @returns {Promise<TeamStats>} The stats for the given team and type.
	 */
	public async findByTeamAndType(team: string, type: StatType): Promise<TeamStats | null> {
		// check if there's already stats for this team
		const cachedTeamStat = await getCachedStat(team, type)
		if (cachedTeamStat) {
			return cachedTeamStat
		}

		const stats = await this.fetchTypeByTeam(team, type)
		return stats
	}

	private async getTeamId(team: string): Promise<string> {
		const locator = await navigateTo(`${BASE_URL_SEARCH}?query=${team}`, WAIT_FOR)
		const headlines = await locator.locator(SELECTOR_SEARCH).all()
		const hrefs = await Promise.all(headlines.map(async headline => headline.getAttribute('href')))
		if (!hrefs[0]) {
			throw new Error(`cant find a href in ${hrefs[0]}`)
		}
		// /team/:id/:name
		const [_, _team, id, _name] = hrefs[0].split('/')
		if (!id) {
			throw new Error(`cant find a id in ${hrefs[0]}`)
		}
		return id
	}

	private async getTeamsMatchHistory(team0Id: string, team1Id: string): Promise<MatchHistory[]> {
		const BASE_URL_RESULTS = 'https://www.hltv.org/results'
		const url = new URL(BASE_URL_RESULTS)
		url.searchParams.append('startDate', '2023-06-18')
		url.searchParams.append('endDate', '2025-06-18')
		url.searchParams.append('requireAllTeams', '')
		url.searchParams.append('team', team0Id)
		url.searchParams.append('team', team1Id)

		const page = await navigateTo(url.toString(), WAIT_FOR)
		const tableRows = await page.locator('.results-all table tbody tr').all()

		let MatchHistoryArray: Array<MatchHistory> = []

		for await (const tr of tableRows) {
			const higherSeedTeam = await tr.locator('.team1 .team').textContent()
			const lowerSeedTeam = await tr.locator('.team2 .team').textContent()
			const winner = await tr.locator('.team-won').textContent()
			const event = await tr.locator('.event .event-name').textContent()

			if (
				typeof higherSeedTeam === 'string' &&
				typeof lowerSeedTeam === 'string' &&
				typeof winner === 'string' &&
				typeof event === 'string'
			) {
				MatchHistoryArray.push({
					'Higher seed team': higherSeedTeam,
					'Lower seed team': lowerSeedTeam,
					'Winner of the match': winner,
					Event: event,
				})
			}
		}

		return MatchHistoryArray
	}

	public async findMatchHistory(teams: string[]): Promise<MatchHistory[]> {
		verboseLog('finding match history for', teams)
		// check if there's already match history for both teams here

		const team0id = await this.getTeamId(teams[0]!)
		const team1id = await this.getTeamId(teams[1]!)

		return this.getTeamsMatchHistory(team0id, team1id)
	}

	// /**
	//  * Retrieve all stats for all teams.
	//  */
	// public async list(): Promise<TeamStats[]> {
	// 	if (TeamStatsRepo.teamStats == null) {
	// 		TeamStatsRepo.teamStats = await this.fetchAll()
	// 	}
	// 	return TeamStatsRepo.teamStats
	// }

	// /**
	//  * Navigate to each page of stats and scrape them.
	//  *
	//  * @returns {Promise<TeamStats[]>} All of the stats we could find.
	//  */
	// private async fetchAll(): Promise<TeamStats[]> {
	// 	const teamStats: TeamStats[] = []

	// 	for (const type of Object.values(StatType)) {
	// 		const stats = await this.fetchType(type)
	// 		teamStats.push(...stats)
	// 	}

	// 	return teamStats
	// }

	// /**
	//  * Scrapes a specific type of stats for all teams.
	//  *
	//  * @param type The type of stats to scrape. (e.g. offense, defense, etc.)
	//  * @returns {Promise<TeamStats[]>} The stats of the given type for all teams.
	//  */
	// private async fetchType(type: StatType): Promise<TeamStats[]> {
	// 	const page = await navigateTo(SOURCES[type], WAIT_FOR)
	// 	const table = await this.parseStatsTables(page)
	// 	const team_name_column_index = table.headers.indexOf(TEAM_NAME_COLUMN)

	// 	const teamStats: TeamStats[] = []
	// 	for (const row of table.body) {
	// 		const team = row[team_name_column_index]!

	// 		const stats = Object.fromEntries(table.headers.map((header, index) => [header, row[index]!]))
	// 		delete stats[TEAM_NAME_COLUMN] // Don't include the team name in the stats blob.

	// 		teamStats.push(new TeamStats(team, type, stats))
	// 	}

	// 	return teamStats
	// }

	// /**
	//  * Parses the stats tables on the given page.
	//  *
	//  * The layout of the tables is a bit convoluted, making the complexity of
	//  * parsing it a bit involved.
	//  *
	//  * The tables look like (roughly):
	//  *
	//  * ┌Page─────────────┬──────────────────────────────────────────┐
	//  * │┌Team Names Tbl─┐│┌Team Data Table─────────────────────────┐│
	//  * ││┌Header Lvl 1─┐│││┌Headers Lvl 1 ────────┬───────────────┐││
	//  * │││-            │││││-     │     Total     │    Passing    │││
	//  * ││├Header Lvl 2─┤│││├Header Lvl 2──┬───────┼───────┬───────┤││
	//  * │││Team         │││││Games │  YDS  │ YDS/G │  YDS  │ YDS/G │││
	//  * ││├Rows─────────┤│││├Rows──┼───────┼───────┼───────┼───────┤││
	//  * │││Dolphins     │││││17    │ 6,822 │ 401.3 │ 4,514 │ 265.5 │││
	//  * ││├─────────────┤│││├──────┼───────┼───────┼───────┼───────┤││
	//  * │││49ers        │││││17    │ 6,773 │ 398.4 │ 4,384 │ 257.9 │││
	//  * ││├─────────────┤│││├──────┼───────┼───────┼───────┼───────┤││
	//  * │││Bills        │││││17    │ 6,712 │ 394.8 │ 4,401 │ 258.9 │││
	//  * ││└─────────────┘│││└──────┴───────┴───────┴───────┴───────┘││
	//  * │└───────────────┘│└────────────────────────────────────────┘│
	//  * └─────────────────┴──────────────────────────────────────────┘
	//  *
	//  * Note the side-by-side tables each with multi-level nested headers.
	//  * Most of the shenanigans you see here are to deal with that.
	//  *
	//  * @param page The page to extract the tables from.
	//  * @returns {Promise<Table>} The parsed tables.
	//  */
	// private async parseStatsTables(page: Locator): Promise<Table> {
	// 	const [namesTable, dataTable] = await page.locator(STATS_TABLE).all()

	// 	if (namesTable == null || dataTable == null) {
	// 		throw new Error(`Tables are missing from ${page.page().url()}`)
	// 	}

	// 	const names = await this.getTeamNamesTable(namesTable)
	// 	const data = await this.getTeamDataTable(dataTable)
	// 	return concatTables(names, data)
	// }

	// /**
	//  * Parses the team names table. It looks like:
	//  *
	//  * ┌Team Names Tbl─┐
	//  * │┌Header Lvl 1─┐│
	//  * ││-            ││
	//  * │├Header Lvl 2─┤│
	//  * ││Team         ││
	//  * │├Rows─────────┤│
	//  * ││Dolphins     ││
	//  * │├─────────────┤│
	//  * ││49ers        ││
	//  * │├─────────────┤│
	//  * ││Bills        ││
	//  * │└─────────────┘│
	//  * └───────────────┘
	//  *
	//  * @param table The table to parse.
	//  * @returns {Promise<Table>} The parsed table.
	//  */
	// private async getTeamNamesTable(table: Locator): Promise<Table> {
	// 	// With the nested headers, we just want the last value, which
	// 	// should be the string "Team"
	// 	const headerMapper = async (header: Locator[]) => {
	// 		const title = await header[header.length - 1]!.textContent()
	// 		if (title == null) {
	// 			throw new Error('No team name found')
	// 		}
	// 		return title.trim()
	// 	}

	// 	// Oddly, the only attribute of any element in the table with the full team name is the `title`
	// 	// on the image. So we find the image and then get the title.
	// 	const bodyMapper = (cell: Locator) => cell.locator('img').first().getAttribute('title')

	// 	return mapTable(table, headerMapper, bodyMapper)
	// }

	// /**
	//  * Parses the data portion of the stats tables. It looks like:
	//  *
	//  * ┌Team Data Table─────────────────────────┐
	//  * │┌Headers Lvl 1 ────────┬───────────────┐│
	//  * ││-     │     Total     │    Passing    ││
	//  * │├Header Lvl 2──┬───────┼───────┬───────┤│
	//  * ││Games │  YDS  │ YDS/G │  YDS  │ YDS/G ││
	//  * │├Rows──┼───────┼───────┼───────┼───────┤│
	//  * ││17    │ 6,822 │ 401.3 │ 4,514 │ 265.5 ││
	//  * │├──────┼───────┼───────┼───────┼───────┤│
	//  * ││17    │ 6,773 │ 398.4 │ 4,384 │ 257.9 ││
	//  * │├──────┼───────┼───────┼───────┼───────┤│
	//  * ││17    │ 6,712 │ 394.8 │ 4,401 │ 258.9 ││
	//  * │└──────┴───────┴───────┴───────┴───────┘│
	//  * └────────────────────────────────────────┘
	//  *
	//  * @param table The table to parse.
	//  * @returns {Promise<Table>} The parsed table.
	//  */
	// private async getTeamDataTable(table: Locator): Promise<Table<string>> {
	// 	// The last header cell for each nested header has a span
	// 	// with a title that contains the value we want. (e.g. "Total Passing Yards")
	// 	const headerMapper = async (header: Locator[]) => {
	// 		const last = header[header.length - 1]!

	// 		const title = await last.locator('span').first()?.getAttribute('title')
	// 		if (title == null) {
	// 			throw new Error('No header title found')
	// 		}

	// 		return title.trim()
	// 	}

	// 	const bodyMapper = async (cell: Locator) => {
	// 		const value = await cell.textContent()
	// 		return value?.trim() || ''
	// 	}

	// 	return mapTable(table, headerMapper, bodyMapper)
	// }
}
