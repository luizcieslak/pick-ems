import { navigateTo } from '../../utils'
import { TeamStats, TeamStatType as StatType } from './entity'

const WAIT_FOR = '.contentCol'

const BASE_URL_SEARCH = 'https://www.hltv.org/search'
const SELECTOR_SEARCH = 'td a[href^="/team"]'
const WAIT_FOR_SEARCH = '.contentCol'

// const SOURCES: { [key in StatType]: string } = {
// 	[StatType.TEAM_STATS]: 'https://www.hltv.org/stats/teams/',
// 	// [StatType.EVENT_HISTORY]: `https://www.hltv.org/stats/teams/events/9565/vitality?startDate=2023-10-18&endDate=2024-01-18`,
// }

/**
 * A repository for retrieving historical stats for each team across
 * offense, defense, turnovers, and special teams.
 */
export class TeamStatsRepo {
	private static teamStats: TeamStats[] = []

	private async getTeamStatsPage(team: string): Promise<string | null> {
		const locator = await navigateTo(`${BASE_URL_SEARCH}?query=${team}`, WAIT_FOR_SEARCH)
		const headlines = await locator.locator(SELECTOR_SEARCH).all()
		console.log('headlines?', headlines)
		const hrefs = await Promise.all(headlines.map(async headline => headline.getAttribute('href')))
		console.log('hrefs?', hrefs)
		return hrefs[0] as string | null
	}

	/**
	 * Scrapes a specific type of stats for all teams.
	 *
	 * @param type The type of stats to scrape. (e.g. offense, defense, etc.)
	 * @returns {Promise<TeamStats[]>} The stats of the given type for all teams.
	 */
	private async fetchTypeByTeam(team: string, type: StatType): Promise<TeamStats | null> {
		const statsPage = await this.getTeamStatsPage(team)

		if (!statsPage) {
			throw new Error(`No stats page found for ${team} and ${type}`)
		}

		const page = await navigateTo(
			`https://www.hltv.org/stats/teams${statsPage.replace(
				'/team',
				''
			)}?startDate=2023-10-18&endDate=2024-01-18`,
			WAIT_FOR
		)

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
		}

		console.log('team stat', team, type, teamStat)

		return teamStat
	}

	/**
	 * Retrieve stats for the given team and stat type.
	 *
	 * @param team The team to retrieve stats for.
	 * @param type The type of stats to retrieve.
	 * @returns {Promise<TeamStats>} The stats for the given team and type.
	 */
	public async findByTeamAndType(team: string, type: StatType): Promise<TeamStats | null> {
		// check if there's already articles for these teams
		const teamStat = TeamStatsRepo.teamStats.find(teamStats => teamStats.team === team)
		if (teamStat) {
			return teamStat
		}

		const stats = await this.fetchTypeByTeam(team, type)
		return stats
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
