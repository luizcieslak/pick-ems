import { Browser, BrowserContext, Page, Locator } from 'playwright'
import { chromium } from 'playwright-extra'
import { CONFIG } from '../config'
import { verboseLog } from './log'

// Load the stealth plugin and use defaults (all tricks to hide playwright usage)
// Note: playwright-extra is compatible with most puppeteer-extra plugins
const stealth = require('puppeteer-extra-plugin-stealth')()

// Add the plugin to Playwright (any number of plugins can be added)
chromium.use(stealth)

let PAGE_SINGLETON: Page | null = null
let BROWSER_SINGLETON: Browser | null = null
let CONTEXT_SINGLETON: BrowserContext | null = null
// Toggle this to true if accepting cookies or logging in is something necessary to scrape.
let FIRST_TIME: boolean = false

const authFile = 'playwright/.auth/user.json'

/**
 * Returns a shared browser instance.
 *
 * Note: The type of this function is `Page`
 * but in Playwright parlance, `Page` is the
 * "browser" (actually a tab in the browser),
 * so this is what we return because it semantically
 * makes more sense.
 *
 * @returns {Promise<Page>}
 */
export async function getBrowserInstance(): Promise<Page> {
	if (PAGE_SINGLETON != null) {
		return PAGE_SINGLETON
	}

	const browser = await chromium.launch({
		headless: CONFIG.HEADLESS,
		// devtools: true,
		slowMo: 100,
	})
	const context = await browser.newContext()
	const page = await context.newPage()

	// Set custom headers
	await page.setExtraHTTPHeaders({
		'User-Agent':
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
		'Accept-Language': 'en-US,en;q=0.9',
	})

	PAGE_SINGLETON = page
	BROWSER_SINGLETON = browser
	CONTEXT_SINGLETON = context

	return page
}

/**
 * Closes the shared browser instance.
 *
 * @returns {Promise<void>}
 */
export async function closeBrowser(): Promise<void> {
	if (PAGE_SINGLETON == null || BROWSER_SINGLETON == null || CONTEXT_SINGLETON == null) {
		return
	}

	await PAGE_SINGLETON.close()
	await CONTEXT_SINGLETON.close()
	await BROWSER_SINGLETON.close()

	PAGE_SINGLETON = null
	BROWSER_SINGLETON = null
	CONTEXT_SINGLETON = null
}

export async function acceptCookies(url: string) {
	const browser = await getBrowserInstance()
	await browser.goto(url)

	// accept cookies
	const allowAllCookies = browser.locator('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll')
	await allowAllCookies.click()
}

export async function logInOnce(url: string) {
	const browser = await getBrowserInstance()
	await browser.goto(url)

	// accept cookies
	const allowAllCookies = browser.locator('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll')
	await allowAllCookies.click()

	// log in
	const signin = browser.locator('.navsignin')
	signin.click()
	const loginInput = browser.getByPlaceholder('Username').locator('visible=true')
	await loginInput.pressSequentially(process.env.HLTV_LOGIN ?? '')
	const pwInput = browser.getByPlaceholder('Password')
	await pwInput.pressSequentially(process.env.HLTV_PASSWORD ?? '')
	const button = browser.locator('button.login-button.button')
	await button.click()
	// End of authentication steps.
	await browser.context().storageState({ path: authFile })
	await browser.waitForTimeout(10000)
}

/**
 * Navigates to the given URL and waits for the given selector to be visible.
 *
 * @param url The URL to navigate to.
 * @param waitForVisible The selector to wait for.
 * @returns {Promise<Locator>} The locator for the given selector.
 */
export async function navigateTo(url: string, waitForVisible: string): Promise<Locator> {
	// it seems neither of these functions are necessary anymore, skipping.
	if (FIRST_TIME) {
		verboseLog('First time navigating, accepting cookies and logging in.')
		await acceptCookies(url)
		await logInOnce(url)
		FIRST_TIME = false
	}

	const browser = await getBrowserInstance()
	await browser.goto(url)

	const container = browser.locator(waitForVisible)
	// await container.waitFor({ state: 'visible' })

	return container
}
