// Supports ES6
// import { create, Whatsapp } from 'venom-bot';
const venom = require("venom-bot");

venom
	.create({
		session: "venom-venom", 
        useChrome: false, // 👈 مهم جدًا لتجنب مشاكل النسخة الجديدة من Chrome
        headless: true,
        args: ['--headless=new', '--no-sandbox'],
	})
	.then((client) => start(client))
	.catch((err) => {
		console.log(err);
	});

function start(client) {
	client.onMessage((message) => {
		if (message.body === "Hi") {
			client
				.sendText(message.from, "Welcome Venom 🕷")
				.then((result) => {
					console.log("Result: ", result); //return object success
				})
				.catch((erro) => {
					console.error("Error when sending: ", erro); //return object error
				});
		}
	});
}
