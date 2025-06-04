const express = require("express");
const axios = require("axios");
const router = express.Router();

require("dotenv").config();
const BASE_URL = process.env.URL || "http://localhost:3000";

// --- Begin: vehicleData to WhatsApp/Telegram messages formatting ---
// Translation and formatting logic adapted from js_ex.js
function vehicleDataToMessages(vehicleData) {
	const messages = [];
	// Create a comprehensive message with all available data
	let detailedMessage = `*${vehicleData.title || ""}*\n`;

	// Only show price if it's not $0
	if (
		vehicleData.price &&
		vehicleData.price !== "$0" &&
		vehicleData.price !== "0" &&
		vehicleData.price !== "$0.00"
	) {
		detailedMessage += `💵 *السعر:* ${vehicleData.price}\n`;
	}

	// Property mapping for translation and emoji
	const propertyMapping = {
		actualCashValue: { arabic: "القيمة النقدية الفعلية", emoji: "💰" },
		vehicle: { arabic: "المركبة", emoji: "🚗" },
		lotNumber: { arabic: "رقم القطعة", emoji: "🔢" },
		stockNumber: { arabic: "رقم المخزون", emoji: "🔢" },
		itemNumber: { arabic: "رقم العنصر", emoji: "🔢" },
		vin: { arabic: "رقم الهيكل", emoji: "🆔" },
		title: { arabic: "سند الملكية", emoji: "📄" },
		titleCode: { arabic: "رمز سند الملكية", emoji: "🔣" },
		titleStatus: { arabic: "حالة سند الملكية", emoji: "📋" },
		titleState: { arabic: "ولاية سند الملكية", emoji: "🏛️" },
		odometer: { arabic: "عداد المسافات", emoji: "🧮" },
		miles: { arabic: "الأميال", emoji: "🧮" },
		mileage: { arabic: "المسافة المقطوعة", emoji: "🧮" },
		damage: { arabic: "الضرر", emoji: "💥" },
		primaryDamage: { arabic: "الضرر الأساسي", emoji: "💥" },
		mainDamage: { arabic: "الضرر الرئيسي", emoji: "💥" },
		secondaryDamage: { arabic: "الضرر الثانوي", emoji: "💥" },
		additionalDamage: { arabic: "ضرر إضافي", emoji: "💥" },
		estRetailValue: { arabic: "القيمة التجارية المقدرة", emoji: "💰" },
		estimatedValue: { arabic: "القيمة المقدرة", emoji: "💰" },
		retailValue: { arabic: "القيمة التجارية", emoji: "💰" },
		value: { arabic: "القيمة", emoji: "💰" },
		cylinders: { arabic: "عدد الأسطوانات", emoji: "⚙️" },
		engineCylinders: { arabic: "أسطوانات المحرك", emoji: "⚙️" },
		color: { arabic: "اللون", emoji: "🎨" },
		exteriorColor: { arabic: "اللون الخارجي", emoji: "🎨" },
		interiorColor: { arabic: "اللون الداخلي", emoji: "🎨" },
		engine: { arabic: "المحرك", emoji: "⚙️" },
		engineType: { arabic: "نوع المحرك", emoji: "⚙️" },
		motor: { arabic: "المحرك", emoji: "⚙️" },
		transmission: { arabic: "ناقل الحركة", emoji: "🔄" },
		trans: { arabic: "ناقل الحركة", emoji: "🔄" },
		gearbox: { arabic: "علبة التروس", emoji: "🔄" },
		drive: { arabic: "نظام الدفع", emoji: "🚗" },
		driveType: { arabic: "نوع الدفع", emoji: "🚗" },
		driveLineType: { arabic: "نوع خط الدفع", emoji: "🚗" },
		drivetrain: { arabic: "نظام الدفع", emoji: "🚗" },
		body: { arabic: "الهيكل", emoji: "🚘" },
		bodyStyle: { arabic: "نوع الهيكل", emoji: "🚘" },
		bodyType: { arabic: "نوع الهيكل", emoji: "🚘" },
		vehicleType: { arabic: "نوع المركبة", emoji: "🚘" },
		fuel: { arabic: "الوقود", emoji: "⛽" },
		fuelType: { arabic: "نوع الوقود", emoji: "⛽" },
		keys: { arabic: "المفاتيح", emoji: "🔑" },
		key: { arabic: "المفتاح", emoji: "🔑" },
		highlights: { arabic: "النقاط البارزة", emoji: "✨" },
		specialNotes: { arabic: "ملاحظات خاصة", emoji: "📝" },
		comments: { arabic: "التعليقات", emoji: "💬" },
		description: { arabic: "الوصف", emoji: "📋" },
	};

	// Track processed properties
	const processedProps = new Set();
	for (const [propKey, mapValue] of Object.entries(propertyMapping)) {
		if (
			vehicleData[propKey] !== undefined &&
			vehicleData[propKey] !== null &&
			vehicleData[propKey] !== ""
		) {
			detailedMessage += `${mapValue.emoji} *${mapValue.arabic}:* ${vehicleData[propKey]}\n`;
			processedProps.add(propKey.toLowerCase());
		}
	}

	// Add any other properties not in the mapping
	for (const [key, value] of Object.entries(vehicleData)) {
		if (
			processedProps.has(key.toLowerCase()) ||
			key === "title" ||
			key === "images" ||
			value === undefined ||
			value === null ||
			value === ""
		)
			continue;
		let arabicKey = key
			.replace(/([A-Z])/g, " $1")
			.trim()
			.replace(/_/g, " ");
		detailedMessage += `ℹ️ *${arabicKey}:* ${value}\n`;
	}

	// Add the detailed text message
	messages.push({ type: "text", body: detailedMessage });

	// Add images (all except last two)
	if (Array.isArray(vehicleData.images) && vehicleData.images.length > 0) {
		const numImagesToInclude = Math.max(0, vehicleData.images.length - 2);
		const imagesToSend = vehicleData.images.slice(0, numImagesToInclude);
		imagesToSend.forEach((imgUrl) => {
			if (imgUrl) {
				messages.push({ type: "image", href: imgUrl });
			}
		});
	}
	return messages;
}
// --- End: vehicleData to WhatsApp/Telegram messages formatting ---

// Helper to split messages for Telegram
function splitMessagesForTelegram(messages) {
	const textMessages = messages.filter((m) => m.type === "text");
	const imageMessages = messages.filter((m) => m.type === "image");
	return { textMessages, imageMessages };
}

// POST /scrape-and-send-via-whatsapp
router.post("/via-whatsapp", async (req, res) => {
	const { href, to } = req.body;
	if (!href || !to) {
		return res.status(400).json({ error: "href and to are required" });
	}
	try {
		// 1. Scrape vehicle data
		const scrapeRes = await axios.get(
			`${BASE_URL}/scrape/vehicle?href=${encodeURIComponent(href)}`,
		);
		const vehicleData = scrapeRes.data.data;
		if (!vehicleData) {
			return res
				.status(500)
				.json({ error: "Failed to scrape vehicle data" });
		}
		// 2. Format messages using the new function
		const messages = vehicleDataToMessages(vehicleData);
		// 3. Send via WhatsApp
		const sendRes = await axios.post(`${BASE_URL}/messages/send`, {
			to,
			messages,
		});
		res.json({
			success: true,
			message: "Vehicle data sent via WhatsApp",
			data: vehicleData,
			sendResult: sendRes.data,
		});
	} catch (error) {
		res.status(500).json({
			error: "Failed to scrape and send via WhatsApp",
			details: error.message,
		});
	}
});

// POST /scrape-and-send-via-telegram
router.post("/via-telegram", async (req, res) => {
	const { href, to } = req.body;
	if (!href || !to) {
		return res.status(400).json({ error: "href and to are required" });
	}
	try {
		// 1. Scrape vehicle data
		const scrapeRes = await axios.get(
			`${BASE_URL}/scrape/vehicle?href=${encodeURIComponent(href)}`,
		);
		const vehicleData = scrapeRes.data.data;
		if (!vehicleData) {
			return res
				.status(500)
				.json({ error: "Failed to scrape vehicle data" });
		}
		// 2. Format messages using the new function
		const messages = vehicleDataToMessages(vehicleData);
		const { textMessages, imageMessages } =
			splitMessagesForTelegram(messages);
		const sendResults = [];
		// 3. Send the first text message (if any)
		if (textMessages.length > 0) {
			try {
				const sendTextRes = await axios.post(
					`${BASE_URL}/telegram/send`,
					{
						username: to,
						text: textMessages[0] ? textMessages[0].body : "",
					},
				);
				sendResults.push({ type: "text", result: sendTextRes.data });
			} catch (err) {
				sendResults.push({
					type: "text",
					error: true,
					details: err.message,
				});
			}
		}
		// 4. Send each image message (with optional caption from the first text message)
		for (const imgMsg of imageMessages) {
			try {
				const sendMediaRes = await axios.post(
					`${BASE_URL}/telegram/sendMedia`,
					{
						username: to,
						mediaUrl: imgMsg.href,
					},
				);
				sendResults.push({
					type: "image",
					href: imgMsg.href,
					result: sendMediaRes.data,
				});
			} catch (err) {
				sendResults.push({
					type: "image",
					href: imgMsg.href,
					error: true,
					details: err.message,
				});
				continue;
			}
		}
		res.json({
			success: true,
			message: "Vehicle data sent via Telegram",
			data: vehicleData,
			sendResults,
		});
	} catch (error) {
		res.status(500).json({
			error: "Failed to scrape and send via Telegram",
			details: error.message,
		});
	}
});

module.exports = router;
