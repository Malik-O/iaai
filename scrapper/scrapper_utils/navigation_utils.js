/**
 * Finds the next page URL and navigates to it by clicking the next button.
 * @param {import('puppeteer').Page} page - The Puppeteer page object.
 * @param {string} nextButtonSelector - Selector for the "Next Page" button/link.
 * @returns {Promise<string|null>} The URL of the next page after navigation, or null if not found or navigation fails.
 */
async function findAndNavigateToNextPage(page, nextButtonSelector) {
	let nextButtonHandle;
	try {
		nextButtonHandle = await page.$(nextButtonSelector);
		if (nextButtonHandle) {
			console.log(
				`'Next Page' button found with selector: ${nextButtonSelector}. Attempting to click.`,
			);
			// It's good practice to await all navigation-triggering actions
			await Promise.all([
				page.waitForNavigation({
					waitUntil: "networkidle2",
					timeout: 60000,
				}), // Wait for navigation to complete
				nextButtonHandle.click(), // Click the button
			]);
			console.log(
				`Successfully clicked 'Next Page' button. New page URL: ${page.url()}`,
			);
			await nextButtonHandle.dispose(); // Dispose of the handle
			return page.url(); // Return the new page's URL
		} else {
			console.log(
				`No 'Next Page' button found with selector: ${nextButtonSelector}. Ending pagination.`,
			);
		}
	} catch (e) {
		console.log(
			`Error clicking or navigating using 'Next Page' button (selector: ${nextButtonSelector}):`,
			e.message,
		);
		// Ensure handle is disposed if it exists and an error occurred after it was assigned
		if (nextButtonHandle) {
			try {
				await nextButtonHandle.dispose();
			} catch (disposeError) {
				console.error(
					"Error disposing nextButtonHandle:",
					disposeError,
				);
			}
		}
	}
	return null; // Return null if no next page or navigation failed
}

module.exports = { findAndNavigateToNextPage };
