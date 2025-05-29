const express = require("express");
const router = express.Router();
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const { Api } = require("telegram/tl");
const input = require("input");

// Telegram client instance
let clientInstance = null;
let isInitializedFlag = false;
let stringSession = new StringSession("");
let tempClient = null;

module.exports = () => {
	// Start initialization process
	const startInit = async (apiId, apiHash, phoneNumber) => {
		try {
			if (isInitializedFlag && clientInstance) {
				return {
					status: "success",
					message: "Telegram client already initialized",
				};
			}

			// Create client
			const client = new TelegramClient(
				stringSession,
				parseInt(apiId),
				apiHash,
				{ connectionRetries: 5 },
			);

			// Connect the client
			await client.connect();

			// Request code
			const codeResult = await client.sendCode(
				{
					apiId: parseInt(apiId),
					apiHash: apiHash,
				},
				phoneNumber,
			);

			// Store temporary client
			tempClient = client;

			return {
				status: "success",
				message: "Code sent successfully",
				phoneCodeHash: codeResult.phoneCodeHash,
				phoneNumber: phoneNumber,
			};
		} catch (error) {
			console.error("Error starting initialization:", error);
			return {
				status: "error",
				message: "Failed to start initialization",
				error: error.message,
			};
		}
	};

	// Complete initialization with code
	const completeInit = async (phoneNumber, phoneCode, phoneCodeHash) => {
		try {
			if (!tempClient) {
				return {
					status: "error",
					message: "No initialization in progress",
				};
			}

			// Sign in with the received code
			const signInResult = await tempClient.invoke(
				new Api.auth.SignIn({
					phoneNumber: phoneNumber,
					phoneCodeHash: phoneCodeHash,
					phoneCode: phoneCode,
				}),
			);

			if (signInResult instanceof Api.auth.AuthorizationSignUpRequired) {
				return {
					status: "error",
					message:
						"Sign up required. Please register your account first.",
				};
			}

			// Save session string
			const sessionString = tempClient.session.save();

			// Set as main client
			clientInstance = tempClient;
			isInitializedFlag = true;
			tempClient = null;

			return {
				status: "success",
				message: "Telegram client initialized successfully",
				session: sessionString,
			};
		} catch (error) {
			console.error("Error completing initialization:", error);
			return {
				status: "error",
				message: "Failed to complete initialization",
				error: error.message,
			};
		}
	};

	// Initialize with existing session
	const initWithSession = async (apiId, apiHash, session) => {
		try {
			const client = new TelegramClient(
				new StringSession(session),
				parseInt(apiId),
				apiHash,
				{ connectionRetries: 5 },
			);

			await client.connect();

			if (await client.isUserAuthorized()) {
				clientInstance = client;
				isInitializedFlag = true;

				return {
					status: "success",
					message: "Telegram client initialized with session",
				};
			}

			return {
				status: "error",
				message: "Session is not valid",
			};
		} catch (error) {
			console.error("Error initializing with session:", error);
			return {
				status: "error",
				message: "Failed to initialize with session",
				error: error.message,
			};
		}
	};

	// Start initialization route
	router.post("/start-init", async (req, res) => {
		try {
			const { apiId, apiHash, phoneNumber } = req.body;

			if (!apiId || !apiHash || !phoneNumber) {
				return res.status(400).json({
					status: "error",
					message: "API ID, API Hash, and phone number are required",
				});
			}

			const result = await startInit(apiId, apiHash, phoneNumber);
			res.json(result);
		} catch (error) {
			console.error("Error in start-init route:", error);
			res.status(500).json({
				status: "error",
				message: "Failed to start initialization",
				error: error.message,
			});
		}
	});

	// Complete initialization route
	router.post("/complete-init", async (req, res) => {
		try {
			const { phoneNumber, phoneCode, phoneCodeHash } = req.body;

			if (!phoneNumber || !phoneCode || !phoneCodeHash) {
				return res.status(400).json({
					status: "error",
					message: "Phone number, code, and code hash are required",
				});
			}

			const result = await completeInit(
				phoneNumber,
				phoneCode,
				phoneCodeHash,
			);
			res.json(result);
		} catch (error) {
			console.error("Error in complete-init route:", error);
			res.status(500).json({
				status: "error",
				message: "Failed to complete initialization",
				error: error.message,
			});
		}
	});

	// Get client instance
	const getClient = () => clientInstance;

	// Check if client is initialized
	const isInitialized = () => isInitializedFlag;

	// Initialize client route
	router.post("/init", async (req, res) => {
		try {
			const { apiId, apiHash, phoneNumber } = req.body;

			if (!apiId || !apiHash || !phoneNumber) {
				return res.status(400).json({
					status: "error",
					message: "API ID, API Hash, and phone number are required",
				});
			}

			const result = await initClient(apiId, apiHash, phoneNumber);
			res.json(result);
		} catch (error) {
			console.error("Error in init route:", error);
			res.status(500).json({
				status: "error",
				message: "Failed to initialize Telegram client",
				error: error.message,
			});
		}
	});

	// Initialize with session route
	router.post("/init-session", async (req, res) => {
		try {
			const { apiId, apiHash, session } = req.body;

			if (!apiId || !apiHash || !session) {
				return res.status(400).json({
					status: "error",
					message:
						"API ID, API Hash, and session string are required",
				});
			}

			const result = await initWithSession(apiId, apiHash, session);
			res.json(result);
		} catch (error) {
			console.error("Error in init-session route:", error);
			res.status(500).json({
				status: "error",
				message: "Failed to initialize with session",
				error: error.message,
			});
		}
	});

	// Send message route
	router.post("/send", async (req, res) => {
		try {
			if (!isInitializedFlag || !clientInstance) {
				return res.status(400).json({
					status: "error",
					message: "Telegram client is not initialized",
				});
			}

			const { username, text } = req.body;

			if (!username || !text) {
				return res.status(400).json({
					status: "error",
					message: "Username and text are required",
				});
			}

			const result = await clientInstance.sendMessage(username, {
				message: text,
			});

			res.json({
				status: "success",
				message: "Message sent successfully",
				result,
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

	// Send media route
	router.post("/sendMedia", async (req, res) => {
		try {
			if (!isInitializedFlag || !clientInstance) {
				return res.status(400).json({
					status: "error",
					message: "Telegram client is not initialized",
				});
			}

			const { username, mediaUrl, caption } = req.body;

			if (!username || !mediaUrl) {
				return res.status(400).json({
					status: "error",
					message: "Username and media URL are required",
				});
			}

			const result = await clientInstance.sendMessage(username, {
				message: caption || "",
				file: mediaUrl,
			});

			res.json({
				status: "success",
				message: "Media sent successfully",
				result,
			});
		} catch (error) {
			console.error("Error sending media:", error);
			res.status(500).json({
				status: "error",
				message: "Failed to send media",
				error: error.message,
			});
		}
	});

	// Get dialogs route
	router.get("/dialogs", async (req, res) => {
		try {
			if (!isInitializedFlag || !clientInstance) {
				return res.status(400).json({
					status: "error",
					message: "Telegram client is not initialized",
				});
			}

			const dialogs = await clientInstance.getDialogs();

			res.json({
				status: "success",
				dialogs: dialogs.map((dialog) => ({
					id: dialog.id,
					name: dialog.title,
					unreadCount: dialog.unreadCount,
				})),
			});
		} catch (error) {
			console.error("Error getting dialogs:", error);
			res.status(500).json({
				status: "error",
				message: "Failed to get dialogs",
				error: error.message,
			});
		}
	});

	// Status route
	router.get("/status", (req, res) => {
		res.json({
			status: "success",
			initialized: isInitializedFlag,
			active: isInitializedFlag && clientInstance !== null,
		});
	});

	// Logout route
	router.post("/logout", async (req, res) => {
		try {
			if (!isInitializedFlag || !clientInstance) {
				return res.status(400).json({
					status: "error",
					message: "Telegram client is not initialized",
				});
			}

			await clientInstance.disconnect();
			clientInstance = null;
			isInitializedFlag = false;
			stringSession = new StringSession("");

			res.json({
				status: "success",
				message: "Logged out successfully",
			});
		} catch (error) {
			console.error("Error logging out:", error);
			res.status(500).json({
				status: "error",
				message: "Failed to logout",
				error: error.message,
			});
		}
	});

	// Get contacts route
	router.get("/contacts", async (req, res) => {
		try {
			if (!isInitializedFlag || !clientInstance) {
				return res.status(400).json({
					status: "error",
					message: "Telegram client is not initialized",
				});
			}

			// Get all contacts
			const contactsResult = await clientInstance.invoke(
				new Api.contacts.GetContacts({}),
			);

			// Get all dialogs (chats, groups, channels)
			const dialogs = await clientInstance.getDialogs();

			// Format contacts data
			const formattedContacts = contactsResult.users.map((contact) => ({
				id: contact.id,
				type: "contact",
				firstName: contact.firstName,
				lastName: contact.lastName,
				phone: contact.phone,
				username: contact.username,
				isBot: contact.bot,
				isSelf: contact.self,
				isPremium: contact.premium,
				isVerified: contact.verified,
				status: contact.status?.className || "Unknown",
			}));

			// Format dialogs data (groups and channels)
			const formattedDialogs = dialogs
				.map((dialog) => {
					const chat = dialog.entity;
					const baseInfo = {
						id: chat.id,
						title: chat.title,
						username: chat.username,
						isVerified: chat.verified,
						participantsCount: chat.participantsCount,
						unreadCount: dialog.unreadCount,
					};

					if (chat.className === "Channel") {
						return {
							...baseInfo,
							type: "channel",
							isChannel: true,
							isBroadcast: chat.broadcast,
							isMegagroup: chat.megagroup,
							hasGeo: chat.hasGeo,
							restrictionReason: chat.restrictionReason,
						};
					} else if (
						chat.className === "Chat" ||
						chat.className === "ChatForbidden"
					) {
						return {
							...baseInfo,
							type: "group",
							isGroup: true,
							deactivated: chat.deactivated,
							isCreator: chat.creator,
							left: chat.left,
						};
					}

					return null;
				})
				.filter(Boolean);

			res.json({
				status: "success",
				contacts: {
					users: formattedContacts,
					count: formattedContacts.length,
				},
				chats: {
					items: formattedDialogs,
					count: formattedDialogs.length,
				},
			});
		} catch (error) {
			console.error("Error getting contacts and chats:", error);
			res.status(500).json({
				status: "error",
				message: "Failed to get contacts and chats",
				error: error.message,
			});
		}
	});

	// Get chat messages route
	router.get("/chat/:username", async (req, res) => {
		try {
			if (!isInitializedFlag || !clientInstance) {
				return res.status(400).json({
					status: "error",
					message: "Telegram client is not initialized",
				});
			}

			const { username } = req.params;
			const { limit = 50, offset = 0 } = req.query;

			if (!username) {
				return res.status(400).json({
					status: "error",
					message: "Username is required",
				});
			}

			// Get the entity (user/chat) by username
			const entity = await clientInstance.getEntity(username);

			// Get messages
			const messages = await clientInstance.getMessages(entity, {
				limit: parseInt(limit),
				offsetId: parseInt(offset),
			});

			// Format messages
			const formattedMessages = messages.map((message) => ({
				id: message.id,
				date: message.date,
				text: message.text,
				fromId: message.fromId?.userId,
				replyTo: message.replyTo?.replyToMsgId,
				media: message.media
					? {
							type: message.media.className,
							// Add more media details as needed
					  }
					: null,
				entities: message.entities?.map((entity) => ({
					type: entity.className,
					offset: entity.offset,
					length: entity.length,
					url: entity.url,
				})),
			}));

			res.json({
				status: "success",
				chat: {
					id: entity.id,
					name:
						entity.title ||
						`${entity.firstName} ${entity.lastName}`.trim(),
					username: entity.username,
					type: entity.className,
				},
				messages: formattedMessages,
			});
		} catch (error) {
			console.error("Error getting chat messages:", error);
			res.status(500).json({
				status: "error",
				message: "Failed to get chat messages",
				error: error.message,
			});
		}
	});

	// Detailed connection status route
	router.get("/connection-status", async (req, res) => {
		try {
			if (!clientInstance) {
				return res.json({
					status: "disconnected",
					message: "Telegram client is not initialized",
				});
			}

			const isConnected = await clientInstance.isConnected();
			const isAuthorized = await clientInstance.isUserAuthorized();

			res.json({
				status:
					isConnected && isAuthorized ? "connected" : "not_connected",
				connected: isConnected,
				authorized: isAuthorized,
				message:
					isConnected && isAuthorized
						? "Telegram client is connected and authorized"
						: "Telegram client is not fully connected or not authorized",
			});
		} catch (error) {
			console.error("Error checking connection status:", error);
			res.status(500).json({
				status: "error",
				message: "Failed to check connection status",
				error: error.message,
			});
		}
	});

	return router;
};
