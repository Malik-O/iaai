const express = require("express");
const router = express.Router();

// Import the scraping process functions from their original location
// You'll need to adjust these paths based on your final folder structure
const {
	executeScrapingProcess,
} = require("../scrapper/main_scrapper/core_scraper");
const {
	scrapeVehicleDetailsPage,
} = require("../scrapper/main_scrapper/vehicle_details_scraper");
const {
	scrapeCaIaaiVehicleDetailsPage,
	scrapeCopartVehicleDetailsPage,
} = require("../utils/scrapper");

// This mapping can be extended if other shorthand URLs are needed
const SITE_MAP = {
	// Using a search URL that is likely to show multiple items and pagination
	iaai: "https://www.iaai.com/Search",
	iaai_vehicle_detail_base: "https://www.iaai.com/VehicleDetail/",
};

module.exports = () => {
	// Route for scraping IAAI search results
	router.get("/iaai", async (req, res) => {
		const targetUrl = SITE_MAP["iaai"];

		if (!targetUrl) {
			console.error(
				'Error: SITE_MAP["iaai"] is not defined or is invalid.',
			);
			return res.status(500).json({
				error: "Internal server configuration error: IAAI URL not defined.",
			});
		}

		console.log(
			`Received request for /scrape/iaai. Target URL: ${targetUrl}`,
		);

		const result = await executeScrapingProcess(targetUrl);

		if (result.success) {
			if (
				result.data &&
				result.data.length === 0 &&
				result.pagesScraped > 0
			) {
				// Case where scraping happened but no items found
				return res.status(200).json({
					message: result.message,
					details: result.details,
					pagesScraped: result.pagesScraped,
					data: result.data,
				});
			}
			return res.json({
				message: result.message,
				totalItems: result.totalItems,
				pagesScraped: result.pagesScraped,
				data: result.data,
			});
		} else {
			// Determine appropriate status code based on the type of error if more granularity is needed
			// For now, using 500 for general scraping failures from executeScrapingProcess
			return res.status(500).json({
				error: result.message,
				details: result.details,
			});
		}
	});

	// Route for scraping vehicle details
	router.get("/vehicle", async (req, res) => {
		const vehicleHref = req.query.href;
		if (!vehicleHref) {
			return res.status(400).json({ error: "Vehicle Href is required." });
		}

		// Construct the target URL for the vehicle detail page
		// Example: https://www.iaai.com/VehicleDetail/42781060~US (assuming id might contain ~US or similar)
		// const targetUrl = `${SITE_MAP.iaai_vehicle_detail_base}${vehicleId}`;
		const targetUrl = vehicleHref;

		console.log(
			`Received request for /scrape/vehicle. Target URL: ${targetUrl}`,
		);

		let result;
		try {
			const url = new URL(targetUrl);
			const domain = url.hostname;

			if (domain === "www.iaai.com") {
				result = await scrapeVehicleDetailsPage(targetUrl);
			} else if (domain === "ca.iaai.com") {
				result = await scrapeCaIaaiVehicleDetailsPage(targetUrl);
			} else if (domain === "www.copart.com") {
				result = await scrapeCopartVehicleDetailsPage(targetUrl);
			} else {
				return res.status(400).json({ error: "Unsupported domain." });
			}
		} catch (error) {
			console.error("Error processing vehicle request:", error);
			return res.status(500).json({
				error: "Failed to process request.",
				details: error.message,
			});
		}

		if (result.success) {
			return res.json({
				message: result.message,
				// vehicleId: vehicleId, // vehicleId is not defined anymore, consider removing or adapting
				data: result.data,
			});
		} else {
			// Determine status code based on error type if needed
			// For now, using 404 if data is null (suggesting vehicle not found or major scrape issue)
			// and 500 for other errors.
			const statusCode =
				result.data === null &&
				result.message.includes("Could not extract")
					? 404
					: 500;
			return res.status(statusCode).json({
				error: result.message,
				// vehicleId: vehicleId, // vehicleId is not defined anymore, consider removing or adapting
				details: result.details,
			});
		}
	});

	return router;
};
