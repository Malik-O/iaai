const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const venom = require("venom-bot");
const path = require("path");

require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the scrapper's 'public' directory
app.use(express.static(path.join(__dirname, "scrapper/public")));

// Global variables for WhatsApp Bot
let clientInstance = null;
let isInitializedFlag = false;
let qrCodeImage = null;
let isQrReady = false;
let venomStarting = false;

// Getters and setters for client and initialization status
const getClient = () => clientInstance;
const setClient = (client) => {
	clientInstance = client;
};
const getIsInitialized = () => isInitializedFlag;
const setIsInitialized = (status) => {
	isInitializedFlag = status;
};
const getQrCode = () => qrCodeImage;
const setQrCode = (qrCode) => {
	qrCodeImage = qrCode;
};
const getIsQrReady = () => isQrReady;
const setIsQrReady = (status) => {
	isQrReady = status;
};
const getVenomStarting = () => venomStarting;
const setVenomStarting = (status) => {
	venomStarting = status;
};

// Initialize Venom Bot
const initVenom = async () => {
	try {
		// If already initialized, return immediately
		if (isInitializedFlag) {
			return {
				status: "success",
				message: "Venom bot already initialized",
			};
		}

		// If venom is already starting up, don't start it again
		if (venomStarting) {
			return {
				status: "initializing",
				message: "Venom bot is already starting",
			};
		}

		// Reset QR code state
		setQrCode(null);
		setIsQrReady(false);
		setVenomStarting(true);

		// Start venom creation process, but don't await it
		venom
			.create({
				session: "venom-api-session",
				useChrome: false,
				headless: true,
				args: ["--headless=new", "--no-sandbox"],
				disableWelcome: true,
				catchQR: (base64Qr, asciiQR, attempts) => {
					// Save QR code image (remove data:image/png;base64, prefix)
					const qrCodeData = base64Qr.replace(
						/^data:image\/png;base64,/,
						"",
					);
					setQrCode(qrCodeData);
					setIsQrReady(true);
					console.log(
						"QR Code generated. Scan it with your WhatsApp!",
					);
				},
				statusFind: (statusSession, session) => {
					console.log("Status:", statusSession);
					if (
						statusSession === "isLogged" ||
						statusSession === "qrReadSuccess" ||
						statusSession === "inChat"
					) {
						setIsInitialized(true);
						setIsQrReady(false);
					}
				},
				logQR: false, // Disable QR output to terminal
			})
			.then((client) => {
				clientInstance = client;
				console.log("Venom client created successfully");
			})
			.catch((error) => {
				console.error("Error creating Venom client:", error);
				setVenomStarting(false);
			});

		// Return immediately, don't wait for the client to be created
		console.log(
			"Venom bot process started. Waiting for QR code generation...",
		);

		return {
			status: "initializing",
			message: "Venom bot initialization started",
		};
	} catch (error) {
		console.error("Error initializing Venom bot:", error);
		setVenomStarting(false);
		return {
			status: "error",
			message: "Failed to initialize Venom bot",
			error: error.message,
		};
	}
};

// Routes
app.get("/", (req, res) => {
	res.json({
		status: "success",
		message: "Combined API Server is running",
		services: [
			{
				name: "WhatsApp Bot (Venom)",
				endpoints: ["/auth/*", "/messages/*"],
				status: isInitializedFlag ? "Connected" : "Not initialized",
			},
			{
				name: "Web Scraper",
				endpoints: ["/scrape/*"],
				status: "Available",
			},
			{
				name: "Telegram Bot",
				endpoints: ["/telegram/*"],
				status: "Available",
			},
		],
	});
});

// Import routes
const authRoutes = require("./routes/auth.routes")(
	initVenom,
	getClient,
	getIsInitialized,
	setClient,
	setIsInitialized,
	getQrCode,
	getIsQrReady,
	getVenomStarting,
);

const messageRoutes = require("./routes/message.routes")(
	getClient,
	getIsInitialized,
);

// Import scrapper routes
const scrapperRoutes = require("./routes/scrapper.routes")();

// Import telegram routes
const telegramRoutes = require("./routes/telegram.routes")();

// Import util routes
const utilRoutes = require("./routes/util.routes")();

// Import scrape and send routes
const scrapeAndSendRoutes = require("./routes/scrape_and_send.routes");

// Use routes
app.use("/auth", authRoutes);
app.use("/messages", messageRoutes);
app.use("/scrape", scrapperRoutes);
app.use("/telegram", telegramRoutes);
app.use("/util", utilRoutes);
// Use scrape-and-send routes at root level
app.use("/scrape-and-send", scrapeAndSendRoutes);

// Start the server
app.listen(port, async () => {
	console.log(`Combined API server is running on port ${port}`);
	console.log(`-----------------------------`);
	console.log(`Services available:`);
	console.log(`1. WhatsApp Bot API:`);
	console.log(`   - Authentication: http://localhost:${port}/auth/*`);
	console.log(`   - Messaging: http://localhost:${port}/messages/*`);
	console.log(`2. Web Scraper API:`);
	console.log(`   - IAAI Search: http://localhost:${port}/scrape/iaai`);
	console.log(
		`   - Vehicle Details: http://localhost:${port}/scrape/vehicle/YOUR_VEHICLE_ID~US`,
	);
	console.log(`3. Telegram Bot API:`);
	console.log(`   - Initialize: http://localhost:${port}/telegram/init`);
	console.log(`   - Send Message: http://localhost:${port}/telegram/send`);
	console.log(`   - Status: http://localhost:${port}/telegram/status`);
	console.log(`-----------------------------`);

	// Uncomment to auto-initialize WhatsApp bot on server start
	// await initVenom();
});

// Handle process termination
process.on("SIGINT", async () => {
	if (clientInstance) {
		console.log("Closing Venom bot session...");
		await clientInstance.close();
	}
	process.exit(0);
});
