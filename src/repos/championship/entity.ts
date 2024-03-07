import { Table } from '../../utils'
import { ChampionshipStat } from './repo'

/**
 * A collection of the stats for a team in the championship.
 */
export class ChampionshipStats {
	/**
	 * Creates a new instance of TeamStats.
	 *
	 * @param team The team the stats are for.
	 * @param type The type of stats. (e.g. Offense, Defense, Turnover, Special Teams)
	 * @param stats A dict of stats for the given team and type. (e.g. { "Total Passing Yards": "4,000" , "Total Games": "16" })
	 * @returns A new instance of TeamStats.
	 */
	constructor(public team: string, public stat: ChampionshipStat) {}

	// /**
	//  * Convert the stats to a table.
	//  *
	//  * @returns {Table} The stats as a table.
	//  */
	public toTable(): Table {
		const headers: string[] = ['Team']
		const body: string[] = [this.team]

		for (const [key, value] of Object.entries(this.stat)) {
			headers.push(key)
			body.push(value)
		}

		return { headers, body: [body] }
	}
}
