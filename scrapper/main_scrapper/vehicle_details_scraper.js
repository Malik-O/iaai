const { launchBrowserAndPage } = require("../scrapper_utils/browser_utils");
const fs = require("fs").promises;
const path = require("path");

// enhanceImageResolution function has been moved inside getVehicleImages

/**
 * Enhanced helper function to find properties in different possible DOM structures.
 * This function will be executed in the browser context via page.evaluate().
 * @param {string} labelText - The text label of the property to find (e.g., 'VIN', 'Odometer').
 * @returns {string|null} The text value of the property or null if not found.
 */
function getPropertyValueByLabelInPage(labelText) {
	console.log(`Looking for property: ${labelText}`);

	// Try multiple selector strategies to find the property
	// Strategy 1: Look for dt/dd pairs (common in definition lists)
	const allDts = document.querySelectorAll("dt");
	for (const dt of allDts) {
		if (
			dt.innerText.trim().toLowerCase().includes(labelText.toLowerCase())
		) {
			const dd = dt.nextElementSibling;
			if (dd && dd.tagName === "DD") {
				return dd.innerText.trim();
			}
		}
	}

	// Strategy 2: Look for specific sections that might contain our data
	// IAAI often uses data-uname or specific class names for data sections
	const dataSection = document.querySelector(
		'.data-list, .vehicle-details, .details-data, [data-uname="vehicleDetailsSection"]',
	);
	if (dataSection) {
		// Within this section, try to find label/value pairs in various formats

		// Try format: <element>Label: <element>Value
		const items = dataSection.querySelectorAll(
			"li, .data-list__item, .detail-item",
		);
		for (const item of items) {
			const text = item.innerText;
			if (text.toLowerCase().includes(labelText.toLowerCase())) {
				// Split by colon and take the second part as the value
				const colonIndex = text.indexOf(":");
				if (colonIndex > -1 && colonIndex < text.length - 1) {
					return text.substring(colonIndex + 1).trim();
				}
			}
		}

		// Try format: <span class="label">Label</span><span class="value">Value</span>
		const spans = dataSection.querySelectorAll("span");
		for (let i = 0; i < spans.length; i++) {
			const span = spans[i];
			if (
				span.innerText.trim().toLowerCase() === labelText.toLowerCase()
			) {
				// Check if next span is the value
				if (i + 1 < spans.length) {
					return spans[i + 1].innerText.trim();
				}
			}
		}
	}

	// Strategy 3: Original approach - look for ul/li/span structures
	// Try to be more specific with selectors based on IAAI's likely structure
	const allLists = document.querySelectorAll(
		"ul.data-list, .details-list, .vehicle-data",
	);
	for (const list of allLists) {
		const items = list.querySelectorAll("li");
		for (const li of items) {
			// Case 1: Direct text match in the li
			if (li.innerText.toLowerCase().includes(labelText.toLowerCase())) {
				const labelParts = li.innerText.split(":");
				if (labelParts.length > 1) {
					return labelParts.slice(1).join(":").trim();
				}
			}

			// Case 2: Span with label followed by span with value
			const spans = li.querySelectorAll("span");
			for (let i = 0; i < spans.length; i++) {
				const span = spans[i];
				if (
					span.innerText.trim().toLowerCase() ===
						labelText.toLowerCase() ||
					span.innerText
						.trim()
						.toLowerCase()
						.includes(labelText.toLowerCase() + ":")
				) {
					// Check if next span exists and contains value
					if (i + 1 < spans.length) {
						return spans[i + 1].innerText.trim();
					}
					// Or if the value is in a different element
					const nextElem = span.nextElementSibling;
					if (nextElem) {
						return nextElem.innerText.trim();
					}
				}
			}
		}
	}

	// Strategy 4: As a last resort, look for labels anywhere in the document
	const allElements = document.querySelectorAll("*");
	for (const elem of allElements) {
		if (
			elem.innerText &&
			!elem.children.length && // Only consider leaf nodes with no children
			elem.innerText.trim().toLowerCase() === labelText.toLowerCase()
		) {
			// Check siblings, parent's siblings, etc.
			const parent = elem.parentElement;
			if (parent) {
				// Check next sibling
				const sibling = parent.nextElementSibling;
				if (sibling) {
					return sibling.innerText.trim();
				}

				// Check parent siblings
				const parentSibling = parent.parentElement?.nextElementSibling;
				if (parentSibling) {
					return parentSibling.innerText.trim();
				}
			}
		}
	}

	// If we still haven't found anything, return null
	console.log(`Property not found: ${labelText}`);
	return null;
}

/**
 * Gets images from the vehicle details page
 * @returns {Array<string>} Array of image URLs
 */
function getVehicleImages() {
	const images = [];

	// Internal function to enhance image resolution
	function enhanceImageResolution(imageUrl) {
		if (!imageUrl) return imageUrl;

		try {
			// Check for IAAI specific image patterns first
			let enhancedUrl = imageUrl;

			// Pattern 1: IAAI resize parameter in the filename
			// Example: /resize/example_100x100.jpg -> /resize/example_500x500.jpg
			const resizePattern = /\/resize\/(.+_)(\d+)x(\d+)(\.[a-zA-Z]+)$/;
			if (resizePattern.test(enhancedUrl)) {
				enhancedUrl = enhancedUrl.replace(
					resizePattern,
					(match, prefix, width, height, ext) => {
						const newWidth = parseInt(width) * 5;
						const newHeight = parseInt(height) * 5;
						return `/resize/${prefix}${newWidth}x${newHeight}${ext}`;
					},
				);
				console.log(
					`Enhanced IAAI resize image: ${enhancedUrl.substring(
						0,
						50,
					)}...`,
				);
				return enhancedUrl;
			}

			// Pattern 2: Check if the URL contains width and height in the path
			const sizePatterns = [
				// Match pattern like /100x100/
				{
					regex: /\/(\d+)x(\d+)\//g,
					replacer: (match, width, height) => {
						const newWidth = parseInt(width) * 5;
						const newHeight = parseInt(height) * 5;
						return `/${newWidth}x${newHeight}/`;
					},
				},
				// Match pattern like /w_100,h_100/
				{
					regex: /\/w_(\d+),h_(\d+)\//g,
					replacer: (match, width, height) => {
						const newWidth = parseInt(width) * 5;
						const newHeight = parseInt(height) * 5;
						return `/w_${newWidth},h_${newHeight}/`;
					},
				},
				// Match pattern like /100/100/
				{
					regex: /\/(\d+)\/(\d+)\//g,
					replacer: (match, width, height) => {
						const newWidth = parseInt(width) * 5;
						const newHeight = parseInt(height) * 5;
						return `/${newWidth}/${newHeight}/`;
					},
				},
				// Match pattern like /-100x100/
				{
					regex: /\/-(\d+)x(\d+)\//g,
					replacer: (match, width, height) => {
						const newWidth = parseInt(width) * 5;
						const newHeight = parseInt(height) * 5;
						return `/-${newWidth}x${newHeight}/`;
					},
				},
			];

			// Try path-based patterns
			for (const pattern of sizePatterns) {
				if (pattern.regex.test(enhancedUrl)) {
					enhancedUrl = enhancedUrl.replace(
						pattern.regex,
						pattern.replacer,
					);
					console.log(
						`Enhanced image URL with path-based dimensions`,
					);
					return enhancedUrl;
				}
			}

			// If we're here, we need to try URL parameters
			const url = new URL(imageUrl);
			let paramChanged = false;

			// Common dimension parameter names
			const dimensionParams = [
				"width",
				"height",
				"w",
				"h",
				"size",
				"maxwidth",
				"maxheight",
				"imgwidth",
				"imgheight",
				"thumb",
				"scale",
				"zoom",
				"quality",
				"format",
				"version",
			];

			// For quality (if present), set to the maximum
			if (url.searchParams.has("quality")) {
				url.searchParams.set("quality", "100");
				paramChanged = true;
			}

			// For IAAI specific - try to get highest version
			if (url.searchParams.has("version")) {
				url.searchParams.set("version", "highres");
				paramChanged = true;
			}

			// For dimension parameters, multiply by 5
			dimensionParams.forEach((param) => {
				if (url.searchParams.has(param)) {
					const currentValue = parseInt(url.searchParams.get(param));
					if (!isNaN(currentValue)) {
						// Multiply by 5 to get higher resolution
						const newValue = currentValue * 5;
						url.searchParams.set(param, newValue.toString());
						console.log(
							`Enhanced ${param} from ${currentValue} to ${newValue}`,
						);
						paramChanged = true;
					}
				}
			});

			return paramChanged ? url.toString() : enhancedUrl;
		} catch (e) {
			// If URL parsing fails, just return the original URL
			console.log(`Failed to enhance image URL: ${e.message}`);
			return imageUrl;
		}
	}

	// Try multiple selector strategies for images

	// Strategy 1: Look for image gallery
	const gallery = document.querySelector(
		".gallery, .image-gallery, .vehicle-images",
	);
	if (gallery) {
		const imgElements = gallery.querySelectorAll("img");
		imgElements.forEach((img) => {
			if (img.src) {
				const enhancedSrc = enhanceImageResolution(img.src);
				images.push(enhancedSrc);
			}
		});
	}

	// Strategy 2: Look for high-res images or thumbnails with data attributes
	const allImgs = document.querySelectorAll(
		"img[data-src], img.vehicle-img, .thumbnail img",
	);
	allImgs.forEach((img) => {
		// Prefer data-src for high resolution if available
		const imgSrc = img.getAttribute("data-src") || img.src;
		if (imgSrc && !images.includes(imgSrc)) {
			const enhancedSrc = enhanceImageResolution(imgSrc);
			images.push(enhancedSrc);
		}
	});

	// Strategy 3: Look specifically for IAAI's vehicle image thumbnails
	// This is the selector provided by the user
	const thumbContainerImgs = document.querySelectorAll(
		".vehicle-image__thumb-container img",
	);
	console.log(
		`Found ${thumbContainerImgs.length} images with .vehicle-image__thumb-container selector`,
	);
	thumbContainerImgs.forEach((img) => {
		// Check for data-src first, then src
		const imgSrc = img.getAttribute("data-src") || img.src;
		// Look for higher resolution versions by checking for specific data attributes
		const hiResAttr =
			img.getAttribute("data-high-res") ||
			img.getAttribute("data-full") ||
			img.getAttribute("data-original");
		const finalSrc = hiResAttr || imgSrc;

		if (finalSrc && !images.includes(finalSrc)) {
			const enhancedSrc = enhanceImageResolution(finalSrc);
			console.log(
				`Adding enhanced image from thumb container: ${enhancedSrc.substring(
					0,
					50,
				)}...`,
			);
			images.push(enhancedSrc);
		}
	});

	// Strategy 4: Look for background images in divs
	const bgElements = document.querySelectorAll(
		".image-container, .thumbnail, .vehicle-image",
	);
	bgElements.forEach((elem) => {
		const style = window.getComputedStyle(elem);
		const bg = style.backgroundImage;
		if (bg && bg !== "none") {
			const url = bg.replace(/url\(['"]?(.*?)['"]?\)/, "$1");
			if (url && !images.includes(url)) {
				const enhancedUrl = enhanceImageResolution(url);
				images.push(enhancedUrl);
			}
		}
	});

	return images;
}

/**
 * Gets the HTML structure information for debugging purposes
 * @returns {object} Debugging information about the page structure
 */
function getPageStructureInfo() {
	const info = {
		title: document.title,
		h1Count: document.querySelectorAll("h1").length,
		ulCount: document.querySelectorAll("ul").length,
		liCount: document.querySelectorAll("li").length,
		dtCount: document.querySelectorAll("dt").length,
		ddCount: document.querySelectorAll("dd").length,
		dataAttributes: [],
		classes: [],
	};

	// Collect unique data attributes for debugging
	document.querySelectorAll("[data-uname]").forEach((el) => {
		const attr = el.getAttribute("data-uname");
		if (!info.dataAttributes.includes(attr)) {
			info.dataAttributes.push(attr);
		}
	});

	// Collect some key class names that might be useful
	const possibleDataClasses = ["data", "details", "vehicle", "info", "specs"];
	document
		.querySelectorAll("div[class], section[class], ul[class]")
		.forEach((el) => {
			const classes = el.className.split(" ");
			classes.forEach((cls) => {
				if (cls && !info.classes.includes(cls)) {
					// Only include classes that might be related to data
					if (
						possibleDataClasses.some((term) =>
							cls.toLowerCase().includes(term),
						)
					) {
						info.classes.push(cls);
					}
				}
			});
		});

	return info;
}

/**
 * Scrapes specific vehicle details from its dedicated page.
 * @param {string} vehicleDetailUrl - The URL of the vehicle detail page.
 * @returns {Promise<{success: boolean, data: object|null, message: string, details?: string}>}
 */
async function scrapeVehicleDetailsPage(vehicleDetailUrl) {
	let browser;
	try {
		const launchResult = await launchBrowserAndPage();
		browser = launchResult.browser;
		const page = launchResult.page;

		// Load cookies if necessary
		try {
			const cookiesPath = path.join(__dirname, "../cookies.json");
			const cookiesString = await fs.readFile(cookiesPath, "utf8");
			const cookies = JSON.parse(cookiesString);
			if (Array.isArray(cookies) && cookies.length > 0) {
				await page.setCookie(...cookies);
				console.log(
					"Successfully loaded cookies for vehicle detail page.",
				);
			}
		} catch (err) {
			if (err.code === "ENOENT") {
				console.log("cookies.json not found for vehicle detail page.");
			} else {
				console.error(
					"Error with cookies.json for vehicle detail page:",
					err.message,
				);
			}
		}

		// Navigate to the page and ensure it's fully loaded
		await page.goto(vehicleDetailUrl, {
			waitUntil: "networkidle2",
			timeout: 60000,
		});
		console.log(`Navigated to vehicle detail page: ${vehicleDetailUrl}`);

		// Wait a bit more for any dynamic content
		// استخدام setTimeout بدلاً من waitForTimeout لضمان التوافقية مع جميع إصدارات Puppeteer
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// First, get debugging information about the page structure
		const pageStructure = await page.evaluate(getPageStructureInfo);
		console.log(
			"Page structure information:",
			JSON.stringify(pageStructure, null, 2),
		);

		// Now extract the actual vehicle data
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
				const titleElement = document.querySelector("h1");
				details.title = titleElement
					? titleElement.innerText.trim()
					: null;

				// Try to get images
				details.images = getVehicleImages();

				// Expand property list based on common IAAI fields and variants
				const propertiesToExtract = [
					"Actual Cash Value",
					"Vehicle",
					"Lot #",
					"Stock #",
					"Item #", // Variants for lot number
					"VIN",
					"Vehicle Identification Number",
					"Title",
					"Title Code",
					"Title Status",
					"Title State",
					"Odometer",
					"Miles",
					"Mileage",
					"Damage",
					"Primary Damage",
					"Main Damage",
					"Secondary Damage",
					"Additional Damage",
					"Est. Retail Value",
					"Estimated Value",
					"Retail Value",
					"Value",
					"Cylinders",
					"Engine Cylinders",
					"Color",
					"Exterior Color",
					"Interior Color",
					"Engine",
					"Engine Type",
					"Motor",
					"Transmission",
					"Trans",
					"Gearbox",
					"Drive",
					"Drive Type",
					"Drive Line Type",
					"Drivetrain",
					"Body",
					"Body Style",
					"Body Type",
					"Vehicle Type",
					"Fuel",
					"Fuel Type",
					"Keys",
					"Key",
					"Highlights",
					"Special Notes",
					"Comments",
					"Description",
				];

				// Create mapping from variation names to standardized property names
				const propertyMapping = {
					// Lot number variations
					"lot #": "lotNumber",
					"stock #": "lotNumber",
					"item #": "lotNumber",

					// VIN variations
					vin: "vin",
					"vehicle identification number": "vin",

					// Title variations
					title: "titleCode",
					"title code": "titleCode",
					"title status": "titleCode",
					"title state": "titleState",

					// Odometer variations
					odometer: "odometer",
					miles: "odometer",
					mileage: "odometer",

					// Damage variations
					damage: "primaryDamage",
					"primary damage": "primaryDamage",
					"main damage": "primaryDamage",
					"secondary damage": "secondaryDamage",
					"additional damage": "secondaryDamage",

					// Value variations
					"est. retail value": "retailValue",
					"estimated value": "retailValue",
					"retail value": "retailValue",
					value: "retailValue",

					// Engine/cylinders variations
					cylinders: "cylinders",
					"engine cylinders": "cylinders",
					engine: "engine",
					"engine type": "engine",
					motor: "engine",

					// Color variations
					color: "color",
					"exterior color": "exteriorColor",
					"interior color": "interiorColor",

					// Transmission variations
					transmission: "transmission",
					trans: "transmission",
					gearbox: "transmission",

					// Drive variations
					drive: "driveType",
					"drive type": "driveType",
					"drive line type": "driveType",
					drivetrain: "driveType",

					// Body style variations
					body: "bodyStyle",
					"body style": "bodyStyle",
					"body type": "bodyStyle",
					"vehicle type": "bodyStyle",

					// Fuel variations
					fuel: "fuelType",
					"fuel type": "fuelType",

					// Keys variations
					keys: "keys",
					key: "keys",

					// Description variations
					highlights: "highlights",
					"special notes": "highlights",
					comments: "highlights",
					description: "highlights",
				};

				const foundValues = {};

				// Try to extract all properties
				propertiesToExtract.forEach((propName) => {
					const value = getPropertyValueByLabel(propName);
					if (value) {
						// Map to standard property name
						const standardProp =
							propertyMapping[propName.toLowerCase()] ||
							propName.toLowerCase();
						foundValues[standardProp] = value;
					}
				});

				// Add all found values to details with standard field names
				for (const [key, value] of Object.entries(foundValues)) {
					details[key] = value;
				}

				return details;
			},
			getPropertyValueByLabelInPage.toString(),
			getVehicleImages.toString(),
		);

		await browser.close();

		if (Object.keys(vehicleData).length === 0 || !vehicleData.title) {
			return {
				success: false,
				message:
					"Could not extract any vehicle data or title was missing.",
				pageStructure,
				data: vehicleData,
			};
		}

		return {
			success: true,
			message: "Vehicle details scraped successfully.",
			data: vehicleData,
		};
	} catch (error) {
		console.error(
			`Error scraping vehicle details from ${vehicleDetailUrl}:`,
			error,
		);
		if (browser) {
			try {
				await browser.close();
			} catch (e) {
				console.error("Error closing browser:", e);
			}
		}
		return {
			success: false,
			message:
				"Failed to scrape vehicle details due to an unexpected error.",
			details: error.message,
			data: null,
		};
	}
}

module.exports = { scrapeVehicleDetailsPage };
