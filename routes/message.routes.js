const express = require("express");
const router = express.Router();

module.exports = (client, isInitialized) => {
	// Send messages
	router.post("/send", async (req, res) => {
		try {
			if (!isInitialized() || !client()) {
				return res.status(400).json({
					status: "error",
					message: "Venom bot is not initialized",
				});
			}

			const { to, messages } = req.body;

			if (
				!to ||
				!messages ||
				!Array.isArray(messages) ||
				messages.length === 0
			) {
				return res.status(400).json({
					status: "error",
					message: "Invalid request format",
				});
			}

			const results = [];

			for (const message of messages) {
				let result;

				switch (message.type) {
					case "text":
						result = await client().sendText(to, message.body);
						break;
					case "image":
						result = await client().sendImage(
							to,
							message.href,
							message.filename || "image",
							message.caption || "",
						);
						break;
					case "file":
						result = await client().sendFile(
							to,
							message.href,
							message.filename || "file",
							message.caption || "",
						);
						break;
					case "sticker":
						result = await client().sendImageAsSticker(
							to,
							message.href,
						);
						break;
					case "audio":
						result = await client().sendVoice(to, message.href);
						break;
					case "video":
						result = await client().sendVideo(
							to,
							message.href,
							message.filename || "video",
							message.caption || "",
						);
						break;
					case "location":
						result = await client().sendLocation(
							to,
							message.latitude,
							message.longitude,
							message.title || "",
						);
						break;
					case "link":
						result = await client().sendLinkPreview(
							to,
							message.url,
							message.title || "",
						);
						break;
					default:
						results.push({
							type: message.type,
							status: "error",
							message: "Unsupported message type",
						});
						continue;
				}

				results.push({
					type: message.type,
					status: "success",
					result,
				});
			}

			res.json({
				status: "success",
				to,
				results,
			});
		} catch (error) {
			console.error("Error sending message:", error);
			res.status(500).json({
				status: "error",
				message: "Failed to send message",
				error: error.message,
			});
		}
	});

	// Get all chats
	router.get("/chats", async (req, res) => {
		try {
			if (!isInitialized() || !client()) {
				return res.status(400).json({
					status: "error",
					message: "Venom bot is not initialized",
				});
			}

			const chats = await client().getAllChats();
			res.json({ status: "success", chats });
		} catch (error) {
			console.error("Error getting chats:", error);
			res.status(500).json({
				status: "error",
				message: "Failed to get chats",
				error: error.message,
			});
		}
	});

	// Get all messages from a specific chat
	router.get("/messages/:chatId", async (req, res) => {
		try {
			if (!isInitialized() || !client()) {
				return res.status(400).json({
					status: "error",
					message: "Venom bot is not initialized",
				});
			}

			const { chatId } = req.params;

			if (!chatId) {
				return res
					.status(400)
					.json({ status: "error", message: "Chat ID is required" });
			}

			const messages = await client().getAllMessagesInChat(chatId);
			res.json({ status: "success", chatId, messages });
		} catch (error) {
			console.error("Error getting messages:", error);
			res.status(500).json({
				status: "error",
				message: "Failed to get messages",
				error: error.message,
			});
		}
	});

	return router;
};
