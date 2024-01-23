import * as fs from 'fs/promises'
import * as path from 'path'
import { llm } from '../../utils'
import { SYSTEM_PROMPT } from './prompt'
import { SCHEMA } from './schema'

export type NewsAnalysis = (typeof SCHEMA)['type']

/**
 * Given an article, this analyzes the article to extract the
 * team it is associated with and a summary of the key takeaways from the article.
 *
 * @param title The title of the article.
 * @param content The content of the article.
 * @returns {Promise<NewsAnalysis>} The analysis of the article.
 */
export async function newsAnalyst(
	title: string,
	content: string,
	team: string,
	cacheResponse = true
): Promise<NewsAnalysis> {
	// 5) open ai will tell what is the primaryTeam talked about in the article,
	// a summary of it
	const article = `${title}\n===\n\n${content}`
	const prompt = SYSTEM_PROMPT(team)

	const response = await llm(prompt, article, SCHEMA)

	if (cacheResponse) {
		const articlesPath = path.join(__filename, '../../../../', 'articles/')
		console.log(articlesPath)
		await fs.mkdir(articlesPath, { recursive: true })
		await fs.writeFile(path.join(articlesPath, `${team}-${title}.json`), JSON.stringify(response), 'utf-8')
	}

	return response
}
