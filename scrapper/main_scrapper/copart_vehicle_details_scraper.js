const { launchBrowserAndPage } = require("../scrapper_utils/browser_utils");
const fs = require("fs").promises;
const path = require("path");

/**
 * Scrapes the Copart vehicle details page to extract core properties using Puppeteer-like approach.
 * @param {string} vehicleDetailUrl - The URL of the vehicle details page.
 * @returns {Promise<Object>} An object containing the scraping status and vehicle details.
 */
async function scrapeCopartVehicleDetailsPage(vehicleDetailUrl) {
	let browser;
	const propertiesToScrape = [
		"title",
		"year",
		"make",
		"model",
		"vin",
		"odometer",
		"engine",
		"drive",
		"fuel",
		"keys",
		"lotNumber",
	];

	try {
		const { browser: launchedBrowser, page } = await launchBrowserAndPage();
		browser = launchedBrowser;

		try {
			const cookiesPath = path.join(__dirname, "../cookies.json");
			const cookiesString = await fs.readFile(cookiesPath, "utf8");
			const cookies = JSON.parse(cookiesString);
			if (Array.isArray(cookies) && cookies.length > 0) {
				await page.setCookie(...cookies);
				console.log(
					"Successfully loaded cookies for Copart vehicle detail page.",
				);
			}
		} catch (err) {
			if (err.code === "ENOENT") {
				console.log(
					"cookies.json not found for Copart vehicle detail page.",
				);
			} else {
				console.error(
					"Error with cookies.json for Copart vehicle detail page:",
					err.message,
				);
			}
		}

		await page.goto(vehicleDetailUrl, {
			waitUntil: "networkidle2",
			timeout: 60000,
		});
		console.log(
			`Navigated to Copart vehicle detail page: ${vehicleDetailUrl}`,
		);

		await new Promise((resolve) => setTimeout(resolve, 3000));

		const vehicleData = await page.evaluate((propertiesToScrapeEval) => {
			const data = {};

			function getValueByLabel(label) {
				const infoBlocks =
					document.querySelectorAll(".lot-details-info");
				for (const block of infoBlocks) {
					const labelEl = block.querySelector(".lot-details-label");
					const valueEl = block.querySelector(".lot-details-value");
					if (
						labelEl &&
						valueEl &&
						labelEl.textContent
							.toLowerCase()
							.includes(label.toLowerCase())
					) {
						return valueEl.textContent.trim();
					}
				}
				const allLabels = document.querySelectorAll("label, span, div");
				for (const el of allLabels) {
					if (
						el.textContent &&
						el.textContent
							.toLowerCase()
							.includes(label.toLowerCase())
					) {
						if (
							el.nextElementSibling &&
							el.nextElementSibling.textContent
						) {
							return el.nextElementSibling.textContent.trim();
						}
						if (el.parentElement) {
							const val = Array.from(
								el.parentElement.children,
							).find(
								(e) =>
									e !== el &&
									e.textContent &&
									e.textContent.trim().length > 0,
							);
							if (val) return val.textContent.trim();
						}
					}
				}
				return null;
			}

			const h1 = document.querySelector("h1");
			if (h1) data.title = h1.textContent.trim();

			if (data.title) {
				const yearMatch = data.title.match(/(19|20)\d{2}/);
				if (yearMatch) data.year = yearMatch[0];
				const parts = data.title.split(" ");
				if (parts.length >= 3) {
					data.make = parts[1];
					data.model = parts.slice(2).join(" ");
				}
			}

			const domLabelMap = {
				vin: ["vin"],
				odometer: ["odometer"],
				engine: ["engine"],
				drive: ["drive"],
				fuel: ["fuel"],
				keys: ["keys"],
				lotNumber: ["lot number", "lot #", "lot"],
			};
			for (const [key, labels] of Object.entries(domLabelMap)) {
				for (const label of labels) {
					const val = getValueByLabel(label);
					if (val) {
						data[key] = val;
						break;
					}
				}
			}

			let appInitScriptContent = null;
			const scripts = document.querySelectorAll("script");
			for (const script of scripts) {
				const scriptText = script.textContent;
				if (
					scriptText &&
					scriptText.includes("var appInit = {") &&
					scriptText.includes("cachedSolrLotDetailsStr:")
				) {
					appInitScriptContent = scriptText;
					break;
				}
			}
			if (appInitScriptContent) {
				const solrDetailsRegex =
					/cachedSolrLotDetailsStr:\s*"((?:\\.|[^"\\])*)"/;
				const solrMatch = appInitScriptContent.match(solrDetailsRegex);
				if (solrMatch && solrMatch[1]) {
					try {
						const jsonData = JSON.parse(solrMatch[1]);
						if (!data.title && jsonData.ld)
							data.title = jsonData.ld;
						if (!data.year && jsonData.lcy)
							data.year = jsonData.lcy;
						if (!data.make && jsonData.mkn)
							data.make = jsonData.mkn;
						if (!data.model && jsonData.lm)
							data.model = jsonData.lm;
						if (!data.vin && jsonData.fv) data.vin = jsonData.fv;
						if (!data.odometer && jsonData.orr)
							data.odometer = `${jsonData.orr} ${
								jsonData.ord || ""
							}`.trim();
						if (!data.primaryDamage && jsonData.dd)
							data.primaryDamage = jsonData.dd;
						if (!data.color && (jsonData.clr || jsonData.ext_color))
							data.color = jsonData.clr || jsonData.ext_color;
						if (!data.engine && jsonData.egn)
							data.engine = jsonData.egn;
						if (!data.drive && jsonData.drv)
							data.drive = jsonData.drv;
						if (!data.fuel && jsonData.ft)
							data.fuel = jsonData.ft;
						if (!data.keys && jsonData.hk) data.keys = jsonData.hk;
						if (!data.lotNumber && jsonData.ln)
							data.lotNumber = jsonData.ln;
					} catch (e) {}
				}
			}
			propertiesToScrapeEval.forEach((prop) => {
				if (!(prop in data)) {
					data[prop] = "N/A";
				}
			});
			return data;
		}, propertiesToScrape);

		await browser.close();

		if (
			Object.keys(vehicleData).length === 0 ||
			vehicleData.title === "N/A" ||
			!vehicleData.title
		) {
			return {
				success: false,
				message:
					"Could not extract core vehicle data or title was missing from Copart.",
				data: vehicleData,
			};
		}

		return {
			success: true,
			message: "Vehicle details scraped successfully from Copart.",
			data: vehicleData,
		};
	} catch (error) {
		console.error(
			`Error scraping Copart vehicle details page (${vehicleDetailUrl}):`,
			error,
		);
		if (browser) {
			try {
				await browser.close();
			} catch (e) {
				console.error("Error closing browser for Copart:", e);
			}
		}
		const errorData = {};
		propertiesToScrape.forEach((prop) => (errorData[prop] = "N/A"));
		return {
			success: false,
			message:
				"Failed to scrape vehicle details from Copart due to an unexpected error.",
			details: error.message,
			data: errorData,
		};
	}
}

module.exports = { scrapeCopartVehicleDetailsPage };
