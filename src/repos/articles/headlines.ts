import { URL } from 'url'
import { navigateTo, distinct } from '../../utils'

/**
 * Crawls the front page for HLTV news and grabs the URLs for each headline.
 */
// export async function getHeadlineUrls(): Promise<URL[]> {
// 	const locator = await navigateTo(BASE_URL, WAIT_FOR)
// 	const headlines = await locator.locator(SELECTOR).all()
// 	const hrefs = await Promise.all(headlines.map(async headline => headline.getAttribute('href')))
// 	return distinct(hrefs).map(href => new URL(href || '', BASE_URL))
// }

const BASE_URL_SEARCH = 'https://www.hltv.org/search'
const SELECTOR_SEARCH = 'td a[href^="/team"]'
const WAIT_FOR_SEARCH = '.contentCol'

async function getTeamPage(team: string): Promise<string | null> {
	const locator = await navigateTo(`${BASE_URL_SEARCH}?query=${team}`, WAIT_FOR_SEARCH)
	const headlines = await locator.locator(SELECTOR_SEARCH).all()
	const hrefs = await Promise.all(headlines.map(async headline => headline.getAttribute('href')))
	return hrefs[0] as string | null
}

const BASE_URL = 'https://www.hltv.org'
const SELECTOR = 'a.subTab-newsArticle'
const WAIT_FOR = '.contentCol'

/**
 * Crawls the search page for HLTV news for a team in specific and grabs the URLs for each headline.
 */
export async function getTeamHeadlineUrls(team: string, limit = 10): Promise<URL[]> {
	const teamPage = await getTeamPage(team)
	const locator = await navigateTo(`${BASE_URL}${teamPage}#tab-newsBox`, WAIT_FOR)
	const headlines = await locator.locator(`${SELECTOR}:nth-child(-n+${limit + 2})`).all()
	const hrefs = await Promise.all(headlines.map(async headline => headline.getAttribute('href')))
	return distinct(hrefs)
		.filter(
			href =>
				href &&
				!href.includes('fantasy-game') &&
				!href.includes('schedule') &&
				!href.includes('team-list') &&
				!href.endsWith('revealed') &&
				!href.endsWith('guide')
		)
		.map(href => new URL(href || '', BASE_URL_SEARCH))
}

// /**
//  * Crawls the search page for HLTV news for a team in specific and grabs the URLs for each headline.
//  */
// export async function getTeamsHeadlineUrls(teams: string[], limit = 1): Promise<URL[]> {
// 	if (!teams[0] || !teams[1]) return []
// 	const team0 = await getTeamHeadlineUrls(teams[0], limit)
// 	const team1 = await getTeamHeadlineUrls(teams[1], limit)

// 	return [...team0, ...team1]
// }
