import { URL } from 'url'
import { navigateTo } from '../../utils'
import { Locator } from 'playwright'

export interface HLTVArticle {
	url: URL
	title: string | undefined
}

const BASE_URL_SEARCH = 'https://www.hltv.org/search'
const SELECTOR_SEARCH = 'td a[href^="/team"]'
const WAIT_FOR_SEARCH = '.contentCol'

async function getTeamPage(team: string): Promise<string | null> {
	const locator = await navigateTo(`${BASE_URL_SEARCH}?query=${team}`, WAIT_FOR_SEARCH)
	const headlines = await locator.locator(SELECTOR_SEARCH).all()
	const hrefs = await Promise.all(headlines.map(async headline => headline.getAttribute('href')))
	return hrefs[0] as string | null
}

const SELECTOR_MEMBERS = '.bodyshot-team a[href^="/player"]'
const SELECTOR_COACH = '.profile-team-stat a[href^="/coach"] .a-default'

async function getTeamMembers(locator: Locator): Promise<(string | null)[]> {
	const membersAnchorLink = await locator.locator(SELECTOR_MEMBERS).all()
	const members = await Promise.all(membersAnchorLink.map(async a => a.getAttribute('title')))

	try {
		const coach = await locator.locator(SELECTOR_COACH).textContent()
		if (coach) members.push(coach.replace("'", ''))
	} catch (error) {}

	return members
}

const BASE_URL = 'https://www.hltv.org'
const SELECTOR = 'a.subTab-newsArticle'
const WAIT_FOR = '.contentCol'

/**
 * Crawls the search page for HLTV news for a team in specific and grabs the URLs for each headline.
 */
export async function getTeamHeadlines(team: string, limit = 10): Promise<HLTVArticle[]> {
	const teamPage = await getTeamPage(team)
	const locator = await navigateTo(`${BASE_URL}${teamPage}#tab-newsBox`, WAIT_FOR)
	const members = await getTeamMembers(locator)

	// limit should be applied in the end, not in the beginning
	const headlines = await locator.locator(`${SELECTOR}:nth-child(-n+${limit * 6})`).all()

	const anchors = await Promise.all(
		headlines.map(async headline => ({
			title: (await headline.innerText()).split('\n')[1],
			href: await headline.getAttribute('href'),
		}))
	)

	const result = anchors.filter(anchor => {
		if (!anchor.href) return
		if (!anchor.title) return

		if (anchor.href.includes('former-00nation')) return
		if (anchor.href.includes('invited')) return
		if (anchor.href.includes('fantasy')) return
		if (anchor.href.includes('announced')) return
		if (anchor.href.endsWith('revealed')) return
		if (anchor.href.includes('schedule')) return
		if (anchor.href.includes('team-list')) return
		// general guides
		if (anchor.href.endsWith('guide')) return

		return (
			anchor.title.includes(team) ||
			members.some(member => typeof member === 'string' && anchor.title?.includes(member))
		)
	})

	return result
		.map(anchor => ({ url: new URL(anchor.href || '', BASE_URL_SEARCH), title: anchor.title }))
		.slice(0, limit)

	// also to decrease the change of rate limit,
	// the cached article should be return before accessing the page.

	// try also to cache stats? only the ones that won't change as team stats, world ranking and event history
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
