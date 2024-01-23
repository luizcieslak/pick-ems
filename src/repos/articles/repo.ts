import { Article } from './entity'
import { getTeamHeadlineUrls } from './headlines'
import { navigateTo } from '../../utils'
import { Locator } from 'playwright'
import { newsAnalyst } from '../../tools'

const WAIT_FOR = 'article.newsitem'
const ARTICLE_TITLE = 'h1.headline'
const ARTICLE_CONTENT = '.newstext-con p'

/**
 * A repository for retrieving Articles related to recent NFL events.
 */
export class ArticleRepo {
	// Cached list of articles for the week.
	private static articles: Article[] = []

	/**
	 * Get the list of articles associated with the given teams.
	 *
	 * @param teams The list of teams to filter by.
	 * @returns {Promise<Article[]>} The list of articles for the week associated with the given teams.
	 */
	// public async findByTeams(teams: string[]): Promise<Article[]> {
	// 	const articles = await this.list()
	// 	// 6) filter the articles by the team in the match.
	// 	return articles.filter(article => teams.includes(article.primaryTeam))
	// }

	// /**
	//  * Get the list of articles associated with current headlines.
	//  *
	//  * @returns {Promise<Article[]>} The list of articles for current headlines.
	//  */
	// public async list(): Promise<Article[]> {
	// 	if (ArticleRepo.articles == null) {
	// 		// 2) from homepage, get a list of articles
	// 		ArticleRepo.articles = await this.fetchAll()
	// 	}
	// 	return ArticleRepo.articles
	// }

	public async findByTeams(teams: string[]): Promise<Article[]> {
		// check if there's already articles for these teams
		const i = ArticleRepo.articles.findIndex(article => teams.includes(article.primaryTeam))
		if (i !== -1) {
			return ArticleRepo.articles.filter(article => teams.includes(article.primaryTeam))
		}

		const articles = await this.fetchFromMatchTeams(teams)
		// 6) filter the articles by the team in the match.
		return articles.filter(article => teams.includes(article.primaryTeam))
	}

	/**
	 * Navigates to the page containing current headlines and for each headline
	 * navigates to the article page and scrapes the article.
	 *
	 * @returns {Promise<Article[]>} The list of articles for current headlines.
	 */
	private async fetchFromMatchTeams(teams: string[]): Promise<Article[]> {
		// 3) in homepage, get a list of URLs
		if (teams.length < 2) throw new Error('Not enough Teams in fetchFromMatchTeams')

		// @ts-ignore teams[0] is not undefined
		const urlsTeam0 = await getTeamHeadlineUrls(teams[0])
		// @ts-ignore teams[1] is not undefined
		const urlsTeam1 = await getTeamHeadlineUrls(teams[1])

		// NOTE: We explicitly use a for-loop instead of `Promise.all` here because
		// we want to force sequential execution (instead of parallel) because these are
		// all sharing the same browser instance.
		const articles: Article[] = []
		for (const url of urlsTeam0) {
			try {
				// @ts-ignore teams[0] is not undefined
				const article = await this.fetchOne(url, teams[0])
				articles.push(article)
			} catch (e) {
				// Sometimes things timeout or a rogue headline sneaks in
				// that is actually an ad. We ignore it and move on.
				continue
			}
		}

		for (const url of urlsTeam1) {
			try {
				// @ts-ignore teams[0] is not undefined
				const article = await this.fetchOne(url, teams[1])
				articles.push(article)
			} catch (e) {
				// Sometimes things timeout or a rogue headline sneaks in
				// that is actually an ad. We ignore it and move on.
				continue
			}
		}

		console.log('articles fetchall', articles)

		return articles
	}

	// /**
	//  * Navigates to the page containing current headlines and for each headline
	//  * navigates to the article page and scrapes the article.
	//  *
	//  * @returns {Promise<Article[]>} The list of articles for current headlines.
	//  */
	// private async fetchAll(): Promise<Article[]> {
	// 	// 3) in homepage, get a list of URLs
	// 	let urls = await getHeadlineUrls()
	// 	// urls = urls.slice(5, 6)
	// 	console.log(
	// 		'urls',
	// 		urls.map(u => u.href)
	// 	)

	// 	// NOTE: We explicitly use a for-loop instead of `Promise.all` here because
	// 	// we want to force sequential execution (instead of parallel) because these are
	// 	// all sharing the same browser instance.
	// 	const articles: Article[] = []
	// 	for (const url of urls) {
	// 		try {
	// 			const article = await this.fetchOne(url)
	// 			articles.push(article)
	// 		} catch (e) {
	// 			// Sometimes things timeout or a rogue headline sneaks in
	// 			// that is actually an ad. We ignore it and move on.
	// 			continue
	// 		}
	// 	}

	// 	console.log('articles fetchall', articles)

	// 	return articles
	// }

	/**
	 * Navigates to the given URL and scrapes the article.
	 *
	 * @param url The URL of the article to scrape.
	 * @returns {Promise<Article>} The article.
	 */
	private async fetchOne(url: URL, team: string): Promise<Article> {
		// 4) for each URL, get the title, content
		// feed it into OpenAI
		const page = await navigateTo(url.toString(), WAIT_FOR)

		const title = await this.getTitle(page)
		const content = await this.getContent(page)
		console.log('title and content', title)
		const { summary } = await newsAnalyst(title, content, team)

		return new Article(title, content, summary, url, team)
	}

	/**
	 * Retrieves the title of the article.
	 *
	 * @param page The page to scrape.
	 * @returns {Promise<string>} The title of the article.
	 */
	private async getTitle(page: Locator): Promise<string> {
		const title = await page.locator(ARTICLE_TITLE).textContent()

		if (title == null || title.length == 0) {
			throw new Error(`Article title not found at ${page.page().url()}`)
		}

		return title
	}

	/**
	 * Retrieves the content of the article.
	 *
	 * @param page The page to scrape.
	 * @returns {Promise<string>} The content of the article.
	 */
	private async getContent(page: Locator): Promise<string> {
		const paragraphs = await page.locator(ARTICLE_CONTENT).all()
		const content = await Promise.all(paragraphs.map(p => p.textContent()))
		return content.join('\n\n')
	}
}
