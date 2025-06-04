const {
	scrapeCaIaaiVehicleDetailsPage,
} = require("../scrapper/main_scrapper/ca_iaai_vehicle_details_scraper.js");
const {
	scrapeCopartVehicleDetailsPage,
} = require("../scrapper/main_scrapper/copart_vehicle_details_scraper.js");

// The placeholder functions previously here are now replaced by the actual imports above.

module.exports = {
	scrapeCaIaaiVehicleDetailsPage,
	scrapeCopartVehicleDetailsPage,
};
