import { URL } from 'url'
import { navigateTo, distinct } from '../../utils'

const BASE_URL = 'https://www.hltv.org/'
const SELECTOR = 'a.newsline.article'
const WAIT_FOR = '.index'

/**
 * Crawls the front page for HLTV news and grabs the URLs for each headline.
 */
export async function getHeadlineUrls(): Promise<URL[]> {
	const locator = await navigateTo(BASE_URL, WAIT_FOR)
	const headlines = await locator.locator(SELECTOR).all()
	const hrefs = await Promise.all(headlines.map(async headline => headline.getAttribute('href')))
	return distinct(hrefs).map(href => new URL(href || '', BASE_URL))
}

const BASE_URL_SEARCH = 'https://www.hltv.org/search'
const SELECTOR_SEARCH = 'td a[href^="/news"]'
const WAIT_FOR_SEARCH = '.contentCol'

/**
 * Crawls the search page for HLTV news for a team in specific and grabs the URLs for each headline.
 */
async function getTeamHeadlineUrls(team: string, limit: number): Promise<URL[]> {
	const locator = await navigateTo(`${BASE_URL_SEARCH}?query=${team}`, WAIT_FOR_SEARCH)
	const headlines = await locator.locator(SELECTOR_SEARCH).all()
	const hrefs = await Promise.all(headlines.map(async headline => headline.getAttribute('href')))
	return distinct(hrefs)
		.map(href => new URL(href || '', BASE_URL_SEARCH))
		.slice(0, limit)
}

/**
 * Crawls the search page for HLTV news for a team in specific and grabs the URLs for each headline.
 */
export async function getTeamsHeadlineUrls(teams: string[], limit = 2): Promise<URL[]> {
	if (!teams[0] || !teams[1]) return []
	const team0 = await getTeamHeadlineUrls(teams[0], limit)
	const team1 = await getTeamHeadlineUrls(teams[1], limit)

	return [...team0, ...team1]
}
