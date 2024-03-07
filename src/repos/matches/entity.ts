import { ChampionshipRepo, ChampionshipStats } from '../championship'
import { ArticleRepo, Article } from '../articles'
import { TeamStatsRepo, TeamStats, TeamStatType, MatchHistory } from '../stats'

type BestOf = '1' | '3' | '5'

/**
 * A match up between two teams.
 *
 * e.g. If a given week has 16 games, then there are 16 matches.
 */
export class Match {
	/**
	 * Creates a new instance of a Match.
	 *
	 * @param away The away team.
	 * @param home The home team.
	 * @param bestOf 1, 3 or 5
	 * @returns A new instance of Match.
	 */
	constructor(public away: string, public home: string, public bestOf: BestOf) {}

	/**
	 * Get the list of articles associated with the given teams in the match.
	 *
	 * @returns {Promise<Article[]>} The list of articles for the week associated with the given teams.
	 */
	// 1) fetch the articles associated with the given teams in the match
	public async articles(): Promise<Article[]> {
		const teams = [this.away, this.home]
		return new ArticleRepo().findByTeams(teams)
	}

	/**
	 * Get all of this season's stats for the teams in this match.
	 *
	 * @returns {Promise<{[key in TeamStatType]: TeamStats[]}>} The stats for the teams
	 */
	public async stats(): Promise<{ [key in TeamStatType]: TeamStats[] }> {
		const teams = [this.away, this.home]
		const repo = new TeamStatsRepo()

		const stats: { [key in TeamStatType]: TeamStats[] } = {
			[TeamStatType.TEAM_STATS]: [],
			[TeamStatType.WORLD_RANKING]: [],
			[TeamStatType.EVENT_HISTORY]: [],
		}

		for (const type of Object.values(TeamStatType)) {
			for (const team of teams) {
				const stat = await repo.findByTeamAndType(team, type)
				if (stat == null) {
					throw new Error(`No stats found for ${team} and ${type}`)
				}
				stats[type].push(stat)
			}
		}

		return stats
	}

	/**
	 * Get all of the previous results from this same matchup.
	 *
	 */
	public async matchHistory(): Promise<MatchHistory[]> {
		const teams = [this.away, this.home]
		const repo = new TeamStatsRepo()

		return repo.findMatchHistory(teams)
	}

	/**
	 * Get team's results of the current championship.
	 *
	 */
	public async championshipStats(): Promise<ChampionshipStats[]> {
		const teams = [this.away, this.home]
		const repo = new ChampionshipRepo()

		return repo.findTeamsResults(teams)
	}
}
