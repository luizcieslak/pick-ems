import { Team } from './entity'

export class TeamRepo {
	// Cached list of teams
	private static teams: Team[] | null = null
}
