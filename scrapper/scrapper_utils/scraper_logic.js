/**
 * Scrapes item data from the current page.
 * @param {import('puppeteer').Page} page - The Puppeteer page object.
 * @param {string} mainContentContainerSelector - Selector for the main content area holding items.
 * @param {string} itemSelector - Selector for individual item containers.
 * @returns {Promise<Array<object>>} Array of scraped items.
 */
async function scrapeSinglePage(
	page,
	mainContentContainerSelector,
	itemSelector,
) {
	try {
		await page.waitForSelector(mainContentContainerSelector, {
			timeout: 20000,
		});
		console.log(
			`Main content container '${mainContentContainerSelector}' found.`,
		);
	} catch (e) {
		console.log(
			`Main content container '${mainContentContainerSelector}' not found on page ${page.url()}.`,
		);
		throw new Error(
			`Main content container '${mainContentContainerSelector}' not found.`,
		);
	}

	const itemHandles = await page.$$(itemSelector);
	const extractedItems = [];
	let itemCount = 0; // Counter for items processed

	for (const itemHandle of itemHandles) {
		let currentItem = null;
		try {
			// Scroll into view only every 5 items or for the first item
			if (itemCount % 5 === 0) {
				await page.evaluate((el) => {
					el.scrollIntoView({
						behavior: "smooth",
						block: "center",
						inline: "center",
					});
				}, itemHandle);
				// Wait a bit after scrolling for lazy-loaded content
				await new Promise((r) => setTimeout(r, 700)); // Slightly increased wait after a scroll
			} else {
				// For items not scrolled to, a shorter wait might still be beneficial if images load progressively
				// Or remove this if scrolling every 5 items is sufficient for all images in that batch to load
				await new Promise((r) => setTimeout(r, 200));
			}

			currentItem = await itemHandle.evaluate((node) => {
				const singleItem = {};
				const titleElement = node.querySelector("h4 a");
				const priceElement = node.querySelector(
					"div:nth-child(4) > ul > li:nth-child(8) > span.data-list__value",
				);
				const imageElement = node.querySelector("img");

				if (titleElement) {
					singleItem.title = titleElement.innerText.trim();
					singleItem.link = titleElement.href
						? new URL(titleElement.href, document.baseURI).href
						: null;
				} else {
					singleItem.title = null;
					singleItem.link = null;
				}

				if (priceElement) {
					singleItem.price = priceElement.innerText.trim();
				} else {
					singleItem.price = null;
				}

				if (imageElement) {
					let imgSrc = imageElement.src;
					const dataSrc = imageElement.getAttribute("data-src");
					if (
						dataSrc &&
						(!imgSrc ||
							imgSrc.startsWith("data:image/") ||
							imgSrc.includes("placeholder"))
					) {
						imgSrc = dataSrc;
					}
					singleItem.image = imgSrc
						? new URL(imgSrc, document.baseURI).href
						: null;
				} else {
					singleItem.image = null;
				}

				return singleItem.title || singleItem.price || singleItem.image
					? singleItem
					: null;
			});

			if (currentItem) {
				extractedItems.push(currentItem);
			}
		} catch (err) {
			console.error(
				`Error processing item #${
					itemCount + 1
				} after scrolling/waiting:`,
				err.message,
			);
		} finally {
			if (itemHandle) {
				await itemHandle.dispose();
			}
			itemCount++; // Increment item counter
		}
	}
	return extractedItems;
}

module.exports = { scrapeSinglePage };
