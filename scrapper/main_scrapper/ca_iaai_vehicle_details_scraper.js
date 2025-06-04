const { launchBrowserAndPage } = require("../scrapper_utils/browser_utils");
const fs = require("fs").promises;
const path = require("path");

// Placeholder for getPropertyValueByLabelInPage specific to ca.iaai.com
function getPropertyValueByLabelInPage_ca_iaai(labelText) {
	console.log(`[ca.iaai.com] Looking for property: ${labelText}`);
	// TODO: Implement specific logic for ca.iaai.com if needed beyond current direct extraction
	// This is a placeholder as current extraction is more direct.
	return null;
}

// Implementation for getVehicleImages specific to ca.iaai.com
function getVehicleImages_ca_iaai() {
	console.log("[ca.iaai.com] Getting vehicle images.");
	const images = [];
	const thumbnailContainer = document.querySelector(
		"#imageThunbnailContainer",
	);

	if (thumbnailContainer) {
		const imgElements = thumbnailContainer.querySelectorAll(
			"img.imageThunbnailItem:not(.engineVideoMenu)",
		);
		imgElements.forEach((img) => {
			const src = img.getAttribute("src");
			const picture = img.getAttribute("data-picture");
			if (picture) {
				images.push(picture);
			} else if (src) {
				images.push(src);
			}
		});
	}
	if (images.length === 0) {
		// Fallback to main image if no thumbnails found
		const mainImage = document.querySelector("#imageRegViewElement");
		if (mainImage && mainImage.src) {
			images.push(mainImage.src);
		}
	}
	console.log(`[ca.iaai.com] Found ${images.length} images.`);
	return images.filter((src) => src); // Filter out any null/empty src
}

// Placeholder for getPageStructureInfo specific to ca.iaai.com
function getPageStructureInfo_ca_iaai() {
	console.log("[ca.iaai.com] Getting page structure info.");
	// TODO: Implement specific logic for ca.iaai.com
	return {
		title: document.title,
		h1Count: document.querySelectorAll("h1").length,
		// Add other relevant structure info for debugging ca.iaai.com
	};
}

async function scrapeCaIaaiVehicleDetailsPage(vehicleDetailUrl) {
	let browser;
	try {
		const launchResult = await launchBrowserAndPage();
		browser = launchResult.browser;
		const page = launchResult.page;

		try {
			const cookiesPath = path.join(__dirname, "../cookies.json"); // Consider site-specific cookies if needed
			const cookiesString = await fs.readFile(cookiesPath, "utf8");
			const cookies = JSON.parse(cookiesString);
			if (Array.isArray(cookies) && cookies.length > 0) {
				await page.setCookie(...cookies);
				console.log(
					"Successfully loaded cookies for ca.iaai.com vehicle detail page.",
				);
			}
		} catch (err) {
			if (err.code === "ENOENT") {
				console.log(
					"cookies.json not found for ca.iaai.com vehicle detail page.",
				);
			} else {
				console.error(
					"Error with cookies.json for ca.iaai.com vehicle detail page:",
					err.message,
				);
			}
		}

		await page.goto(vehicleDetailUrl, {
			waitUntil: "networkidle2",
			timeout: 60000,
		});
		console.log(
			`Navigated to ca.iaai.com vehicle detail page: ${vehicleDetailUrl}`,
		);

		await new Promise((resolve) => setTimeout(resolve, 3000)); // Increased timeout slightly

		// Get debugging information
		const pageStructure = await page.evaluate(getPageStructureInfo_ca_iaai);
		console.log(
			"[ca.iaai.com] Page structure information:",
			JSON.stringify(pageStructure, null, 2),
		);

		// TODO: Implement the actual scraping logic for ca.iaai.com
		// For now, it returns a placeholder response.
		const vehicleData = await page.evaluate(
			(getPropertyValueFuncStr, getVehicleImagesFuncStr) => {
				const getPropertyValueByLabel = new Function(
					`return ${getPropertyValueFuncStr}`,
				)();
				const getVehicleImages = new Function(
					`return ${getVehicleImagesFuncStr}`,
				)();

				const details = {};

				// Get title
				const titleElement = document.querySelector("h1"); // This might need adjustment for ca.iaai.com
				if (titleElement) {
					// Try to get year, make, model from the h1 structure
					const h1Text = titleElement.innerText.trim();
					const stockMatch = h1Text.match(/Stock #\s*([\w\d]+)/i);
					const yearMatch = h1Text.match(/(\d{4})/);
					const makeModelMatch = h1Text.match(
						/\d{4}\s+([\w\s]+?)\s+([\w\s\d]+)/,
					); // More flexible for make/model

					if (stockMatch) details.lotNumber = stockMatch[1];
					if (yearMatch) details.year = yearMatch[1];
					if (makeModelMatch) {
						details.make = makeModelMatch[1].trim();
						details.model = makeModelMatch[2].trim();
					}
					details.title = h1Text;
				}

				details.images = getVehicleImages();

				const propertiesToExtract = [
					"VIN",
					"Odometer",
					"Primary Damage",
					"Secd. Damage",
					"Body Style",
					"Engine",
					"Transmission",
					"Drive Line Type",
					"Fuel Type",
					"Cylinders",
					"Keys Present",
					"Exterior Colour",
					"ACV",
					"Damage Estimate", // Added from HTML example
					// "Actual Cash Value" -> ACV
					// "Est. Retail Value" -> Damage Estimate? or map from ACV
					// "Title" -> "Vehicle Brand"
				];

				const propertyMapping = {
					vin: "vin",
					odometer: "odometer", // Will need to handle "Km (Actual)"
					"primary damage": "primaryDamage",
					"secd. damage": "secondaryDamage",
					"body style": "bodyStyle",
					engine: "engine",
					transmission: "transmission",
					"drive line type": "driveType",
					"fuel type": "fuelType",
					cylinders: "cylinders",
					"keys present": "keys",
					"exterior colour": "exteriorColor",
					acv: "actualCashValue", // Mapping ACV from example
					"damage estimate": "estimatedRepairCost", // Mapping from example
					// "vehicle brand": "titleCode" // Or "titleStatus" depending on desired output
				};

				const foundValues = {};

				// Special handling for title/year/make/model from h1 already done.

				// Extract from "Vehicle Information" section (VIN, Body Style, Engine etc.)
				const vinInfoSection = document.querySelector("#divVINInfo");
				if (vinInfoSection) {
					const rows =
						vinInfoSection.querySelectorAll(".conditTableRow");
					rows.forEach((row) => {
						const labelEl = row.querySelector(
							".conditTableCell.conditLabel",
						);
						const valueEl = row.querySelector(
							".conditTableCell span[aria-label]",
						);
						if (labelEl && valueEl) {
							const labelText = labelEl.innerText
								.trim()
								.replace(":", "")
								.toLowerCase();
							const valueText = valueEl.innerText.trim();

							// Direct mapping for known labels
							if (propertyMapping[labelText]) {
								foundValues[propertyMapping[labelText]] =
									valueText;
							} else {
								// console.log(`[ca.iaai.com] Unhandled VIN section label: ${labelText}`);
							}
						}
					});
				}

				// Extract from "VEHICLE ANNOUNCEMENT" section (Primary Damage, Odometer, etc.)
				const conditionInfoSection =
					document.querySelector(".conditionCheck");
				if (conditionInfoSection) {
					const rows =
						conditionInfoSection.querySelectorAll(
							".conditTableRow",
						);
					rows.forEach((row) => {
						const labelEl = row.querySelector(
							".conditTableCell.conditLabel",
						);
						const valueEl = row.querySelector(
							".conditTableCell span[aria-label]",
						);
						if (labelEl && valueEl) {
							const labelText = labelEl.innerText
								.trim()
								.replace(":", "")
								.toLowerCase();
							let valueText = valueEl.innerText.trim();

							if (labelText === "odometer") {
								valueText = valueText
									.replace(" (Actual)", "")
									.trim(); // Clean up odometer
							}
							if (labelText === "keys present") {
								valueText =
									valueText.toLowerCase() === "yes"
										? "Yes"
										: "No";
							}

							if (propertyMapping[labelText]) {
								// Prefer value if already found (e.g. from VIN section if more specific)
								if (!foundValues[propertyMapping[labelText]]) {
									foundValues[propertyMapping[labelText]] =
										valueText;
								}
							} else {
								// console.log(`[ca.iaai.com] Unhandled Condition section label: ${labelText}`);
							}
						}
					});
				}

				// Extract from "Overview" section (ACV, Damage Estimate)
				const overviewSection = document.querySelector(
					"#VehicleOverviewSection .detailOverview",
				);
				if (overviewSection) {
					const items = overviewSection.querySelectorAll("li");
					items.forEach((item) => {
						const labelEl = item.querySelector("label"); // ACV, Damage Estimate
						const valueEl = item.querySelector("span[aria-label]");
						if (labelEl && valueEl) {
							const labelText = labelEl.innerText
								.trim()
								.toLowerCase();
							const valueText = valueEl.innerText.trim();
							if (
								labelText.includes("acv") &&
								!foundValues.actualCashValue
							) {
								foundValues.actualCashValue = valueText;
							} else if (
								labelText.includes("damage estimate") &&
								!foundValues.estimatedRepairCost
							) {
								foundValues.estimatedRepairCost = valueText;
							}
						}
					});
				}

				for (const [key, value] of Object.entries(foundValues)) {
					details[key] = value;
				}

				// Ensure all core properties from propertiesToExtract are at least null if not found
				propertiesToExtract.forEach((prop) => {
					const standardProp =
						propertyMapping[prop.toLowerCase()] ||
						prop.toLowerCase().replace(/\s+/g, "");
					if (!details[standardProp]) {
						details[standardProp] = null;
					}
				});

				return details;
			},
			getPropertyValueByLabelInPage_ca_iaai.toString(), // Pass the correct function
			getVehicleImages_ca_iaai.toString(), // Pass the correct function
		);

		await browser.close();

		if (Object.keys(vehicleData).length === 0 || !vehicleData.title) {
			return {
				success: false,
				message:
					"Could not extract any vehicle data or title was missing from ca.iaai.com.",
				pageStructure, // Include page structure for debugging
				data: vehicleData,
			};
		}

		return {
			success: true,
			message: "Vehicle details scraped successfully from ca.iaai.com.",
			data: vehicleData,
		};
	} catch (error) {
		console.error(
			`Error scraping vehicle details from ca.iaai.com (${vehicleDetailUrl}):`,
			error,
		);
		if (browser) {
			try {
				await browser.close();
			} catch (e) {
				console.error("Error closing browser for ca.iaai.com:", e);
			}
		}
		return {
			success: false,
			message:
				"Failed to scrape vehicle details from ca.iaai.com due to an unexpected error.",
			details: error.message,
			data: null,
		};
	}
}

module.exports = { scrapeCaIaaiVehicleDetailsPage };
