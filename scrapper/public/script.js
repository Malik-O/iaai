// Main script for IAAI Scraper UI
document.addEventListener("DOMContentLoaded", () => {
	// Element references
	const scrapeListBtn = document.getElementById("scrape-list-btn");
	const scrapeDetailsBtn = document.getElementById("scrape-details-btn");
	const clearResultsBtn = document.getElementById("clear-results-btn");
	const vehicleIdInput = document.getElementById("vehicle-id");
	const resultsContainer = document.getElementById("results-container");
	const listProgress = document.getElementById("list-progress");
	const detailsProgress = document.getElementById("details-progress");

	// Templates
	const vehicleCardTemplate = document.getElementById(
		"vehicle-card-template",
	);

	// Event listeners
	scrapeListBtn.addEventListener("click", fetchVehicleList);
	scrapeDetailsBtn.addEventListener("click", fetchVehicleDetails);
	clearResultsBtn.addEventListener("click", clearResults);

	// Event delegation for dynamically created "View Details" buttons
	resultsContainer.addEventListener("click", (e) => {
		if (e.target.classList.contains("btn-details")) {
			e.preventDefault();
			const vehicleId = e.target.getAttribute("data-id");
			if (vehicleId) {
				vehicleIdInput.value = vehicleId;
				fetchVehicleDetails();
			}
		}
	});

	/**
	 * Fetches the list of vehicles from the API
	 */
	async function fetchVehicleList() {
		toggleLoading(listProgress, true);
		clearResults();

		try {
			const response = await fetch("/scrape_iaai");

			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}

			const data = await response.json();
			if (data.success === false) {
				showError(data.error || "Failed to load vehicle listings");
				return;
			}

			displayVehicleList(data);
		} catch (error) {
			console.error("Error fetching vehicle list:", error);
			showError(`Failed to load vehicle listings: ${error.message}`);
		} finally {
			toggleLoading(listProgress, false);
		}
	}

	/**
	 * Fetches vehicle details from the API
	 */
	async function fetchVehicleDetails() {
		const vehicleId = vehicleIdInput.value.trim();

		if (!vehicleId) {
			showError("Please enter a vehicle ID");
			return;
		}

		toggleLoading(detailsProgress, true);
		clearResults();

		try {
			const response = await fetch(`/scrape/${vehicleId}`);

			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}

			const data = await response.json();
			if (data.error) {
				showError(data.error);
				return;
			}

			displayVehicleDetails(data);
		} catch (error) {
			console.error("Error fetching vehicle details:", error);
			showError(`Failed to load vehicle details: ${error.message}`);
		} finally {
			toggleLoading(detailsProgress, false);
		}
	}

	/**
	 * Displays a list of vehicles
	 */
	function displayVehicleList(data) {
		if (!data.data || data.data.length === 0) {
			resultsContainer.innerHTML = `
                <div class="alert alert-info">
                    No vehicles found. ${data.message || ""}
                </div>
            `;
			return;
		}

		// Create a container for the vehicle cards
		const vehiclesContainer = document.createElement("div");
		vehiclesContainer.className = "row";

		// Show summary info
		const summaryDiv = document.createElement("div");
		summaryDiv.className = "alert alert-success mb-4";
		summaryDiv.innerHTML = `
            <strong>Success!</strong> Found ${data.totalItems} vehicles across ${data.pagesScraped} pages.
        `;
		resultsContainer.innerHTML = "";
		resultsContainer.appendChild(summaryDiv);

		// Process each vehicle and create a card
		data.data.forEach((vehicle) => {
			const cardClone = vehicleCardTemplate.content.cloneNode(true);

			// Extract the vehicle ID from the link if it exists
			let vehicleId = null;
			if (vehicle.link) {
				const linkParts = vehicle.link.split("/");
				vehicleId = linkParts[linkParts.length - 1]; // Get the last part of the URL
			}

			// Set the image
			const imgElement = cardClone.querySelector(".vehicle-img");
			if (vehicle.image) {
				imgElement.src = vehicle.image;
			} else {
				imgElement.src =
					"https://via.placeholder.com/300x200?text=No+Image";
			}

			// Set the title
			const titleElement = cardClone.querySelector(".vehicle-title");
			titleElement.textContent = vehicle.title || "Unknown Vehicle";

			// Set the price
			const priceElement = cardClone.querySelector(".vehicle-price");
			priceElement.textContent = vehicle.price || "Price not available";

			// Set up the details button
			const detailsButton = cardClone.querySelector(".btn-details");
			if (vehicleId) {
				detailsButton.setAttribute("data-id", vehicleId);
			} else {
				detailsButton.style.display = "none";
			}

			// Add to the container
			vehiclesContainer.appendChild(cardClone);
		});

		resultsContainer.appendChild(vehiclesContainer);
	}

	/**
	 * Displays detailed information about a vehicle
	 */
	function displayVehicleDetails(data) {
		if (!data.data) {
			resultsContainer.innerHTML = `
                <div class="alert alert-warning">
                    No details found for this vehicle.
                </div>
            `;
			return;
		}

		const vehicle = data.data;

		// Create the main container
		const detailsContainer = document.createElement("div");

		// Add the title section
		const titleSection = document.createElement("div");
		titleSection.className = "mb-4";
		titleSection.innerHTML = `
            <h2>${vehicle.title || "Vehicle Details"}</h2>
            <p class="text-muted">ID: ${data.vehicleId || "N/A"}</p>
        `;
		detailsContainer.appendChild(titleSection);

		// Create a row for the content
		const contentRow = document.createElement("div");
		contentRow.className = "row";

		// Create the details column
		const detailsCol = document.createElement("div");
		detailsCol.className = "col-md-6";

		// Basic Information Section
		const basicInfoSection = createDetailsSection("Basic Information");
		addDetailRow(basicInfoSection, "VIN", vehicle.vin);
		addDetailRow(basicInfoSection, "Lot Number", vehicle.lotNumber);
		addDetailRow(basicInfoSection, "Title Status", vehicle.titleCode);
		addDetailRow(basicInfoSection, "Title State", vehicle.titleState);
		detailsCol.appendChild(basicInfoSection);

		// Vehicle Specifications Section
		const specsSection = createDetailsSection("Vehicle Specifications");
		addDetailRow(specsSection, "Engine", vehicle.engine);
		addDetailRow(specsSection, "Cylinders", vehicle.cylinders);
		addDetailRow(specsSection, "Transmission", vehicle.transmission);
		addDetailRow(specsSection, "Drive Type", vehicle.driveType);
		addDetailRow(specsSection, "Fuel Type", vehicle.fuelType);
		addDetailRow(specsSection, "Body Style", vehicle.bodyStyle);
		addDetailRow(
			specsSection,
			"Exterior Color",
			vehicle.exteriorColor || vehicle.color,
		);
		addDetailRow(specsSection, "Interior Color", vehicle.interiorColor);
		addDetailRow(specsSection, "Odometer", vehicle.odometer);
		detailsCol.appendChild(specsSection);

		// Condition & Pricing Section
		const conditionSection = createDetailsSection("Condition & Pricing");
		addDetailRow(conditionSection, "Primary Damage", vehicle.primaryDamage);
		addDetailRow(
			conditionSection,
			"Secondary Damage",
			vehicle.secondaryDamage,
		);
		addDetailRow(conditionSection, "Retail Value", vehicle.retailValue);
		addDetailRow(conditionSection, "Keys", vehicle.keys);
		addDetailRow(conditionSection, "Notes", vehicle.highlights);
		detailsCol.appendChild(conditionSection);

		contentRow.appendChild(detailsCol);

		// Create the images column
		const imagesCol = document.createElement("div");
		imagesCol.className = "col-md-6";

		if (vehicle.images && vehicle.images.length > 0) {
			const gallerySection = document.createElement("div");
			gallerySection.className = "vehicle-image-gallery";

			// Add each image to the gallery
			vehicle.images.forEach((imageUrl) => {
				const imgContainer = document.createElement("div");
				imgContainer.className = "mb-3";

				const img = document.createElement("img");
				img.src = imageUrl;
				img.className = "img-fluid";
				img.alt = "Vehicle Image";

				imgContainer.appendChild(img);
				gallerySection.appendChild(imgContainer);
			});

			imagesCol.appendChild(gallerySection);
		} else {
			imagesCol.innerHTML = `
                <div class="alert alert-info">
                    No images available for this vehicle.
                </div>
            `;
		}

		contentRow.appendChild(imagesCol);
		detailsContainer.appendChild(contentRow);

		// Display the details
		resultsContainer.innerHTML = "";
		resultsContainer.appendChild(detailsContainer);
	}

	/**
	 * Creates a section for displaying details
	 */
	function createDetailsSection(title) {
		const section = document.createElement("div");
		section.className = "vehicle-details-section";

		const heading = document.createElement("h4");
		heading.textContent = title;
		section.appendChild(heading);

		return section;
	}

	/**
	 * Adds a row with label and value to a details section
	 */
	function addDetailRow(section, label, value) {
		if (!value) return; // Don't add rows for missing values

		const row = document.createElement("div");
		row.className = "detail-row row";

		row.innerHTML = `
            <div class="col-sm-4 detail-label">${label}:</div>
            <div class="col-sm-8 detail-value">${value}</div>
        `;

		section.appendChild(row);
	}

	/**
	 * Displays an error message
	 */
	function showError(message) {
		resultsContainer.innerHTML = `
            <div class="alert alert-danger">
                <strong>Error:</strong> ${message}
            </div>
        `;
	}

	/**
	 * Clears the results container
	 */
	function clearResults() {
		resultsContainer.innerHTML = `
            <div class="alert alert-info">
                Click on one of the buttons above to load data.
            </div>
        `;
	}

	/**
	 * Toggles the loading indicator
	 */
	function toggleLoading(progressElement, isLoading) {
		if (isLoading) {
			progressElement.classList.remove("d-none");
		} else {
			progressElement.classList.add("d-none");
		}
	}
});
