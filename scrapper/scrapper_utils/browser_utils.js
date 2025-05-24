const puppeteer = require("puppeteer");

const HEADLESS_MODE = true; // Or true, depending on your default preference, can be configured further

/**
 * Launches a Puppeteer browser and creates a new page.
 * @returns {Promise<{browser: import('puppeteer').Browser, page: import('puppeteer').Page}>}
 */
async function launchBrowserAndPage() {
	const browser = await puppeteer.launch({
		headless: HEADLESS_MODE,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage();
	await page.setUserAgent(
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
	);
	// await page.setViewport({ width: 1280, height: 800 }); // Optional
	return { browser, page };
}

module.exports = { launchBrowserAndPage };