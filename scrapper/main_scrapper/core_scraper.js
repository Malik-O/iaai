const fs = require("fs").promises;
const path = require("path");
const { launchBrowserAndPage } = require("../scrapper_utils/browser_utils");
const { scrapeSinglePage } = require("../scrapper_utils/scraper_logic");
// const { findAndNavigateToNextPage } = require('../scrapper_utils/navigation_utils'); // Currently commented out by user

const MAX_PAGES_TO_SCRAPE = 5; // You might want to pass this as a parameter or configure it elsewhere

/**
 * Executes the main scraping process for a given target URL.
 * @param {string} targetUrl - The URL to scrape.
 * @returns {Promise<{success: boolean, data: any, message: string, pagesScraped?: number, totalItems?: number, details?: string}>}
 */
async function executeScrapingProcess(targetUrlFromApp) {
	let browser;
	try {
		const launchResult = await launchBrowserAndPage();
		browser = launchResult.browser;
		const page = launchResult.page;

		// Load cookies before the first navigation
		try {
			const cookiesPath = path.join(__dirname, "../cookies.json"); // Adjusted path relative to this file's new location
			const cookiesString = await fs.readFile(cookiesPath, "utf8");
			const cookies = JSON.parse(cookiesString);
			if (Array.isArray(cookies) && cookies.length > 0) {
				await page.setCookie(...cookies);
				console.log(
					"Successfully loaded and set cookies from cookies.json",
				);
			} else {
				console.log(
					"cookies.json was empty or not an array. Proceeding without setting cookies from file.",
				);
			}
		} catch (err) {
			if (err.code === "ENOENT") {
				console.log(
					"cookies.json not found. Proceeding without loading cookies from file.",
				);
			} else {
				console.error(
					"Error reading or parsing cookies.json:",
					err.message,
					". Proceeding without loading cookies from file.",
				);
			}
		}

		let currentPageUrl = targetUrlFromApp;
		const allItems = [];
		let pageCount = 0;

		const mainContentContainerSelector =
			".table--custom-view > .table-body";
		const itemSelector = ".table--custom-view > .table-body > div";
		// const nextButtonSelector = '.btn-next'; // Defined but navigation is disabled by user

		await page.goto(currentPageUrl, {
			waitUntil: "networkidle2",
			timeout: 60000,
		});

		while (pageCount < MAX_PAGES_TO_SCRAPE) {
			console.log(
				`Scraping page: ${currentPageUrl} (Attempting page ${
					pageCount + 1
				})`,
			);
			let itemsOnPage = [];
			try {
				itemsOnPage = await scrapeSinglePage(
					page,
					mainContentContainerSelector,
					itemSelector,
				);
				if (itemsOnPage.length > 0) {
					allItems.push(...itemsOnPage);
					console.log(
						`Found ${itemsOnPage.length} items on page ${
							pageCount + 1
						}.`,
					);
				} else {
					console.log(
						`No items found on page ${
							pageCount + 1
						} using item selector '${itemSelector}'.`,
					);
					if (pageCount === 0 && allItems.length === 0) {
						console.log(
							"Consider verifying item selectors if the main container was present but no items were extracted on the first page.",
						);
					}
				}
			} catch (e) {
				console.log(
					`Failed to scrape page ${pageCount + 1}: ${e.message}`,
				);
				if (pageCount === 0) {
					await browser.close();
					return {
						success: false,
						message:
							"Scraping failed: Main content container not found on the initial page.",
						details: `Selector '${mainContentContainerSelector}' not found at ${currentPageUrl}. Site structure may have changed or URL is incorrect.`,
						data: [],
					};
				}
				console.log(
					"Stopping pagination due to missing main content on a subsequent page.",
				);
				break;
			}

			pageCount++;
			if (pageCount >= MAX_PAGES_TO_SCRAPE) {
				console.log(
					`Reached max pages to scrape (${MAX_PAGES_TO_SCRAPE}). Stopping pagination.`,
				);
				break;
			}

			// User has commented out navigation logic in server.js, so it's effectively disabled here too.
			// currentPageUrl = await findAndNavigateToNextPage(page, nextButtonSelector);
			// if (!currentPageUrl) {
			console.log(
				"Navigation to next page is disabled. Processing current page only.",
			);
			break;
			// }
		}

		await browser.close();
		browser = null;

		if (allItems.length === 0) {
			return {
				success: true, // Still a success in terms of process completion
				message:
					"Scraping completed, but no items found matching the criteria.",
				details: `Checked ${pageCount} page(s). Either target pages were empty, or selectors did not match. Verify selectors and target URL ('${targetUrlFromApp}').`,
				pagesScraped: pageCount,
				data: [],
			};
		}

		return {
			success: true,
			message: "Scraping successful",
			totalItems: allItems.length,
			pagesScraped: pageCount,
			data: allItems,
		};
	} catch (error) {
		console.error("Error during scraping process:", error);
		if (browser) {
			try {
				await browser.close();
			} catch (closeError) {
				console.error("Error closing browser:", closeError);
			}
		}
		return {
			success: false,
			message: "Failed to scrape the website due to an unexpected error.",
			details: error.message,
			data: null,
		};
	}
}

module.exports = { executeScrapingProcess };
