const express = require("express");
const router = express.Router();

module.exports = (
	initVenom,
	client,
	isInitialized,
	setClient,
	setInitialized,
	getQrCode,
	getIsQrReady,
	getVenomStarting,
) => {
	// Initialize the bot
	router.post("/init", async (req, res) => {
		try {
			// Check if already initialized
			if (isInitialized()) {
				return res.json({
					status: "success",
					message: "Venom bot already initialized",
				});
			}

			// Start initialization if not already started
			if (!getVenomStarting()) {
				await initVenom();
			}

			// Check if QR code is ready
			let attempts = 0;
			const maxAttempts = 300; // Maximum attempts to wait for QR
			const interval = 2000; // Interval between checks in milliseconds

			// Check if client wants image only response (from query parameter)
			const responseType = req.query.responseType || "image";

			// Wait for QR code to be generated
			const checkQrOrStatus = () => {
				console.log("Checking QR status, attempt:", attempts);

				// If already initialized (somehow got connected during our checks)
				if (isInitialized()) {
					return res.json({
						status: "success",
						message: "WhatsApp successfully connected",
					});
				}

				// If QR is ready
				if (getIsQrReady() && getQrCode()) {
					// If client wants image response
					if (responseType === "image") {
						const qrBuffer = Buffer.from(getQrCode(), "base64");
						res.set("Content-Type", "image/png");
						return res.send(qrBuffer);
					}
					// Default: return JSON with base64 image
					return res.json({
						status: "qr_ready",
						message: "QR Code is ready for scanning",
						qrcode: {
							base64: getQrCode(),
							type: "image/png",
						},
					});
				}

				// If we've tried too many times
				if (attempts >= maxAttempts) {
					return res.status(408).json({
						status: "timeout",
						message: "Timeout waiting for QR code generation",
					});
				}

				// Try again after interval
				attempts++;
				setTimeout(checkQrOrStatus, interval);
			};

			// Start checking for QR
			checkQrOrStatus();
		} catch (error) {
			console.error("Error in /init:", error);
			res.status(500).json({
				status: "error",
				message: "Failed to initialize Venom bot",
				error: error.message,
			});
		}
	});

	// Get QR Code as a direct image
	router.get("/qrcode.png", (req, res) => {
		if (!getIsQrReady() || !getQrCode()) {
			// No QR available, redirect to init
			return res.redirect("/auth/init?responseType=image");
		}

		// Return the QR code as an image
		const qrBuffer = Buffer.from(getQrCode(), "base64");
		res.set("Content-Type", "image/png");
		return res.send(qrBuffer);
	});

	// Get QR Code (JSON response)
	router.get("/qrcode", (req, res) => {
		// Check if client wants image only response (from query parameter)
		const responseType = req.query.responseType || "json";

		if (isInitialized()) {
			return res.json({
				status: "connected",
				message: "WhatsApp is already connected",
			});
		}

		if (getIsQrReady() && getQrCode()) {
			// If client wants image response
			if (responseType === "image") {
				const qrBuffer = Buffer.from(getQrCode(), "base64");
				res.set("Content-Type", "image/png");
				return res.send(qrBuffer);
			}
			// Default: return JSON with base64 image
			return res.json({
				status: "qr_ready",
				message: "QR Code is ready for scanning",
				qrcode: {
					base64: getQrCode(),
					type: "image/png",
				},
			});
		} else if (getVenomStarting()) {
			return res.json({
				status: "initializing",
				message: "Venom is starting, QR code not yet ready",
			});
		} else {
			return res.status(404).json({
				status: "not_ready",
				message:
					"QR Code is not ready yet. Start initialization first.",
			});
		}
	});

	// Get connection status
	router.get("/status", (req, res) => {
		if (isInitialized() && client()) {
			const isConnected = client().isConnected();
			return res.json({
				status: isConnected ? "connected" : "disconnected",
				message: isConnected
					? "Venom bot is connected"
					: "Venom bot is disconnected",
			});
		} else if (getVenomStarting()) {
			if (getIsQrReady()) {
				return res.json({
					status: "awaiting_scan",
					message: "Waiting for QR code to be scanned",
				});
			} else {
				return res.json({
					status: "initializing",
					message: "Venom bot is initializing",
				});
			}
		} else {
			return res.json({
				status: "not_initialized",
				message: "Venom bot is not initialized",
			});
		}
	});

	// Logout and close session
	router.post("/logout", async (req, res) => {
		try {
			if (!isInitialized() || !client()) {
				return res.status(400).json({
					status: "error",
					message: "Venom bot is not initialized",
				});
			}

			await client().close();
			setInitialized(false);
			setClient(null);

			res.json({ status: "success", message: "Logged out successfully" });
		} catch (error) {
			console.error("Error during logout:", error);
			res.status(500).json({
				status: "error",
				message: "Failed to logout",
				error: error.message,
			});
		}
	});

	return router;
};
