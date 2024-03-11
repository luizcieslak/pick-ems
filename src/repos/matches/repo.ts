import { Match } from './entity'

/**
 * A repository for retrieving and mutating Matches for the current week.
 */
export class MatchRepo {
	private static matches: Match[] | null = null

	/**
	 * Get the list of matches.
	 *
	 * This returns one entry for each game that will be played, each containing
	 * the two teams that will play.
	 *
	 * @returns {Promise<Match[]>} The list of matches.
	 */
	public async list(): Promise<Match[]> {
		if (MatchRepo.matches == null) {
			MatchRepo.matches = [
				new Match('FaZe', 'Spirit', '5'),
				// new Match('Spirit', 'Vitality', '3'),
				// new Match('Spirit', 'Vitality', '3'),
				// new Match('Spirit', 'Vitality', '3'),
			]
		}
		return MatchRepo.matches
	}
}
