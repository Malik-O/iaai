const express = require("express");
const axios = require("axios");
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
			console.log({ to, messages });
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

				try {
					switch (message.type) {
						case "text":
							result = await client().sendText(to, message.body);
							break;
						case "image":
							const {
								data: { url, success },
							} = await axios.post(
								"http://localhost:3000/util/crop_img",
								{ imageUrl: message.href },
								{
									headers: {
										"Content-Type": "application/json",
									},
								},
							);
							if (success) {
								result = await client().sendImage(
									to,
									url,
									message.filename || "image",
									message.caption || "",
								);
							}
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
				} catch (err) {
					results.push({
						type: message.type,
						status: "error",
						message: err.message,
					});
					continue;
				}
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
