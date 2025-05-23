# WhatsApp API with Venom Bot

واجهة برمجة تطبيقات RESTful مبنية على مكتبة Venom Bot لإرسال واستقبال رسائل WhatsApp.

## المميزات

-   إرسال رسائل نصية، صور، ملفات، فيديوهات، ملصقات، مواقع، وروابط
-   إرسال رسائل متعددة في طلب واحد
-   الحصول على قائمة المحادثات
-   الحصول على قائمة الرسائل من محادثة معينة
-   التحقق من حالة الاتصال
-   تسجيل الدخول والخروج
-   استلام رمز QR كصورة مباشرة أو كـ JSON مع base64

## متطلبات النظام

-   Node.js v14 أو أحدث
-   npm v6 أو أحدث

## التثبيت

1. استنساخ المشروع:

```bash
git clone https://github.com/yourusername/venom-api.git
cd venom-api
```

2. تثبيت الاعتمادات:

```bash
npm install
```

3. تشغيل الخادم:

```bash
npm start
```

للتطوير:

```bash
npm run dev
```

## الاستخدام

يجب عليك أولاً بدء تهيئة البوت قبل إرسال أي رسائل.

### تهيئة البوت

```
POST /auth/init
```

هناك عدة استجابات محتملة:

1. إذا كان البوت مهيأً بالفعل:

```json
{
	"status": "success",
	"message": "Venom bot already initialized"
}
```

2. أثناء عملية التهيئة:

```json
{
	"status": "initializing",
	"message": "Venom bot initialization started"
}
```

3. إذا كان رمز QR جاهزًا للمسح (استجابة JSON):

```json
{
	"status": "qr_ready",
	"message": "QR Code is ready for scanning",
	"qrcode": {
		"base64": "BASE64_ENCODED_QR_IMAGE",
		"type": "image/png"
	}
}
```

### الحصول على رمز QR كصورة مباشرة

يمكنك الحصول على رمز QR كصورة مباشرة (ليس JSON) بأي من الطرق التالية:

1. استخدام النقطة النهائية المخصصة للصور:

```
GET /auth/qrcode.png
```

2. استخدام معلمة الاستعلام `responseType=image` مع أي من النقاط النهائية:

```
GET /auth/qrcode?responseType=image
```

أو

```
POST /auth/init?responseType=image
```

يمكنك استخدام هذه الـ URL مباشرة في الصفحة كمصدر لعنصر `<img>`:

```html
<img src="http://localhost:3000/auth/qrcode.png" alt="WhatsApp QR Code" />
```

### الحصول على رمز QR كـ JSON

يمكنك الحصول على رمز QR كجزء من استجابة JSON (بتنسيق base64):

```
GET /auth/qrcode
```

ثم استخدام قيمة base64 في عنصر HTML:

```html
<img
	src="data:image/png;base64,BASE64_ENCODED_QR_IMAGE"
	alt="WhatsApp QR Code"
/>
```

### التحقق من حالة الاتصال

```
GET /auth/status
```

استجابات محتملة:

```json
{
	"status": "connected",
	"message": "Venom bot is connected"
}
```

```json
{
	"status": "disconnected",
	"message": "Venom bot is disconnected"
}
```

```json
{
	"status": "initializing",
	"message": "Venom bot is initializing"
}
```

```json
{
	"status": "awaiting_scan",
	"message": "Waiting for QR code to be scanned"
}
```

```json
{
	"status": "not_initialized",
	"message": "Venom bot is not initialized"
}
```

### إرسال رسائل

```
POST /messages/send
```

نموذج الطلب:

```json
{
	"to": "971XXXXXXXXX@c.us",
	"messages": [
		{
			"type": "text",
			"body": "مرحبا بالعالم!"
		},
		{
			"type": "image",
			"href": "https://example.com/image.jpg",
			"caption": "صورة جميلة"
		}
	]
}
```

أنواع الرسائل المدعومة:

| النوع    | المعلمات المطلوبة   | المعلمات الاختيارية |
| -------- | ------------------- | ------------------- |
| text     | body                | -                   |
| image    | href                | caption, filename   |
| file     | href                | caption, filename   |
| sticker  | href                | -                   |
| audio    | href                | -                   |
| video    | href                | caption, filename   |
| location | latitude, longitude | title               |
| link     | url                 | title               |

استجابة ناجحة:

```json
{
  "status": "success",
  "to": "971XXXXXXXXX@c.us",
  "results": [
    {
      "type": "text",
      "status": "success",
      "result": { ... }
    },
    {
      "type": "image",
      "status": "success",
      "result": { ... }
    }
  ]
}
```

### الحصول على المحادثات

```
GET /messages/chats
```

استجابة ناجحة:

```json
{
  "status": "success",
  "chats": [ ... ]
}
```

### الحصول على رسائل من محادثة معينة

```
GET /messages/messages/:chatId
```

استجابة ناجحة:

```json
{
  "status": "success",
  "chatId": "971XXXXXXXXX@c.us",
  "messages": [ ... ]
}
```

### تسجيل الخروج

```
POST /auth/logout
```

استجابة ناجحة:

```json
{
	"status": "success",
	"message": "Logged out successfully"
}
```

## هيكل المشروع

```
.
├── routes/
│   ├── auth.routes.js       # طرق المصادقة وبدء التشغيل
│   └── message.routes.js    # طرق الرسائل
├── server.js                # الملف الرئيسي للخادم
├── package.json             # تبعيات المشروع
└── README.md                # هذا الملف
```

## مثال على واجهة المستخدم لمسح رمز QR

يمكنك إنشاء صفحة ويب بسيطة تقوم بتهيئة WhatsApp وعرض رمز QR للمسح:

```html
<!DOCTYPE html>
<html>
	<head>
		<title>WhatsApp API - QR Code Scanner</title>
		<style>
			body {
				font-family: Arial, sans-serif;
				max-width: 600px;
				margin: 0 auto;
				padding: 20px;
				text-align: center;
			}
			#qrCode {
				margin: 20px auto;
				padding: 20px;
				border: 1px solid #ddd;
				border-radius: 4px;
				max-width: 300px;
			}
			button {
				padding: 10px 15px;
				background-color: #25d366;
				color: white;
				border: none;
				border-radius: 4px;
				cursor: pointer;
			}
			.status {
				margin: 20px 0;
				padding: 10px;
				border-radius: 4px;
			}
			.success {
				background-color: #d4edda;
				color: #155724;
			}
			.error {
				background-color: #f8d7da;
				color: #721c24;
			}
			.waiting {
				background-color: #fff3cd;
				color: #856404;
			}
		</style>
	</head>
	<body>
		<h1>WhatsApp API - مسح رمز QR</h1>
		<div id="status" class="status waiting">
			اضغط على زر التهيئة لبدء الاتصال بواتساب
		</div>
		<button id="initButton">تهيئة واتساب</button>
		<div id="qrCode"></div>

		<script>
			const apiUrl = "http://localhost:3000";
			const initButton = document.getElementById("initButton");
			const qrCode = document.getElementById("qrCode");
			const status = document.getElementById("status");
			let statusCheckInterval;

			initButton.addEventListener("click", async () => {
				try {
					status.className = "status waiting";
					status.innerText = "جاري تهيئة واتساب...";
					initButton.disabled = true;

					// طريقة أسهل: استخدام الصورة مباشرة
					qrCode.innerHTML = `<p>جاري توليد رمز QR...</p>`;

					// بدء تهيئة WhatsApp
					fetch(`${apiUrl}/auth/init`, {
						method: "POST",
					});

					// بدء استطلاع الحالة
					startStatusPolling();

					// عرض الصورة من نقطة نهاية الصورة مباشرة
					// نضيف timestamp لمنع التخزين المؤقت
					setTimeout(() => {
						qrCode.innerHTML = `
							<img 
								src="${apiUrl}/auth/qrcode.png?t=${Date.now()}" 
								alt="WhatsApp QR Code"
								onerror="this.style.display='none'"
								onload="this.style.display='block'" 
							/>
							<p>امسح رمز QR باستخدام تطبيق واتساب</p>
						`;
					}, 2000);
				} catch (error) {
					status.className = "status error";
					status.innerText = `خطأ: ${error.message}`;
					initButton.disabled = false;
				}
			});

			// Start polling for connection status
			function startStatusPolling() {
				// Clear existing interval if any
				if (statusCheckInterval) {
					clearInterval(statusCheckInterval);
				}

				// Start a new interval
				statusCheckInterval = setInterval(pollStatus, 2000);
			}

			async function pollStatus() {
				try {
					const response = await fetch(`${apiUrl}/auth/status`);
					const data = await response.json();

					if (data.status === "connected") {
						qrCode.innerHTML = "";
						status.className = "status success";
						status.innerText = "تم الاتصال بنجاح!";
						initButton.disabled = false;

						// Stop polling once connected
						if (statusCheckInterval) {
							clearInterval(statusCheckInterval);
						}
					} else if (data.status === "awaiting_scan") {
						// QR code is displayed, we're waiting for scan
						status.innerText = "يرجى مسح رمز QR باستخدام هاتفك";
					} else if (data.status === "not_initialized") {
						status.className = "status error";
						status.innerText =
							"لم يتم تهيئة واتساب. الرجاء المحاولة مرة أخرى.";
						initButton.disabled = false;

						// Stop polling if not initialized
						if (statusCheckInterval) {
							clearInterval(statusCheckInterval);
						}
					}
				} catch (error) {
					console.error("خطأ أثناء التحقق من الحالة:", error);
				}
			}
		</script>
	</body>
</html>
```

## استخدام في المشاريع

يمكنك استخدام واجهة API في أي لغة برمجة من خلال طلبات HTTP كالتالي:

### مثال باستخدام JavaScript / Node.js

```javascript
const axios = require("axios");
const fs = require("fs");

// تهيئة البوت والحصول على رمز QR

// طريقة 1: الحصول على صورة QR مباشرة
async function initAndSaveQrImage() {
	try {
		// بدء تهيئة WhatsApp
		await axios.post("http://localhost:3000/auth/init");

		// انتظار قليلاً لتوليد رمز QR
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// الحصول على صورة QR مباشرة
		const response = await axios.get(
			"http://localhost:3000/auth/qrcode.png",
			{
				responseType: "arraybuffer",
			},
		);

		// حفظ الصورة في ملف
		fs.writeFileSync("qrcode.png", response.data);
		console.log("QR Code image saved to qrcode.png");

		// بدء التحقق من حالة الاتصال
		checkConnectionStatus();
	} catch (error) {
		console.error("Error:", error.message);
	}
}

// طريقة 2: الحصول على QR كـ JSON مع base64
axios
	.post("http://localhost:3000/auth/init")
	.then((response) => {
		const data = response.data;
		if (data.status === "qr_ready") {
			console.log("QR Code received! Scan it with your phone.");
			// يمكنك حفظ الصورة أو عرضها في التطبيق
			const qrBase64 = data.qrcode.base64;
			fs.writeFileSync(
				"qrcode_from_json.png",
				Buffer.from(qrBase64, "base64"),
			);
			console.log("QR Code image saved to qrcode_from_json.png");
		} else if (data.status === "initializing") {
			console.log(
				"WhatsApp is initializing. Need to poll for QR code...",
			);
			// هنا يمكنك البدء في استطلاع نقطة نهاية /auth/qrcode
			pollForQRCode();
		} else {
			console.log(data.message);
		}
	})
	.catch((error) => console.error(error));

// التحقق من حالة الاتصال
function checkConnectionStatus() {
	const interval = setInterval(async () => {
		try {
			const response = await axios.get(
				"http://localhost:3000/auth/status",
			);
			if (response.data.status === "connected") {
				console.log("WhatsApp connected! You can send messages now.");
				clearInterval(interval);
			} else {
				console.log(
					"Status:",
					response.data.status,
					"-",
					response.data.message,
				);
			}
		} catch (error) {
			console.error("Error checking status:", error.message);
		}
	}, 2000);
}

// استطلاع للحصول على رمز QR
function pollForQRCode() {
	const checkQR = setInterval(() => {
		axios
			.get("http://localhost:3000/auth/qrcode")
			.then((response) => {
				const data = response.data;
				if (data.status === "qr_ready") {
					console.log("QR Code is now ready!");
					// يمكنك حفظ الصورة أو عرضها في التطبيق
					const qrBase64 = data.qrcode.base64;
					fs.writeFileSync(
						"qrcode_polled.png",
						Buffer.from(qrBase64, "base64"),
					);
					console.log("QR Code image saved to qrcode_polled.png");

					// توقف عن الاستطلاع بعد الحصول على رمز QR
					clearInterval(checkQR);
				} else if (data.status === "connected") {
					console.log("WhatsApp is already connected!");
					clearInterval(checkQR);
				}
			})
			.catch((error) => {
				console.error("Error polling for QR code:", error);
			});
	}, 2000); // استطلاع كل 2 ثانية
}

// إرسال رسائل متعددة
axios
	.post("http://localhost:3000/messages/send", {
		to: "971XXXXXXXXX@c.us",
		messages: [
			{
				type: "text",
				body: "مرحبا بالعالم!",
			},
			{
				type: "image",
				href: "https://example.com/image.jpg",
				caption: "صورة جميلة",
			},
		],
	})
	.then((response) => console.log(response.data))
	.catch((error) => console.error(error));
```

### مثال باستخدام Python

```python
import requests
import json
import base64
import time
import os
from io import BytesIO
from PIL import Image

# طريقة 1: الحصول على صورة QR مباشرة
def get_qr_image_directly():
	# بدء تهيئة WhatsApp
	init_resp = requests.post('http://localhost:3000/auth/init')
	print('Started initialization:', init_resp.json())

	# انتظار قليلاً لتوليد رمز QR
	time.sleep(2)

	# الحصول على صورة QR مباشرة
	qr_image_resp = requests.get('http://localhost:3000/auth/qrcode.png', stream=True)
	if qr_image_resp.status_code == 200:
		# حفظ الصورة كملف
		with open('qrcode_direct.png', 'wb') as f:
			f.write(qr_image_resp.content)
		print('QR code image saved as qrcode_direct.png')

		# عرض الصورة (اختياري، إذا كان لديك المكتبات المناسبة)
		try:
			image = Image.open(BytesIO(qr_image_resp.content))
			image.show()
		except Exception as e:
			print('Cannot display image:', e)
	else:
		print('Failed to get QR image:', qr_image_resp.text)

# طريقة 2: الحصول على QR كـ JSON مع base64
def init_and_get_qr_as_json():
	# تهيئة البوت والحصول على رمز QR
	resp = requests.post('http://localhost:3000/auth/init')
	data = resp.json()

	if data['status'] == 'qr_ready':
		print('QR Code received! Scan it with your phone.')
		# حفظ رمز QR كملف
		qr_base64 = data['qrcode']['base64']
		with open('qrcode_from_json.png', 'wb') as f:
			f.write(base64.b64decode(qr_base64))
		print('QR Code saved as qrcode_from_json.png')

		# التحقق من حالة الاتصال
		check_connection_status()
	elif data['status'] == 'initializing':
		print('WhatsApp is initializing. Polling for QR code...')
		# استطلاع للحصول على رمز QR
		poll_for_qr_code()
	else:
		print(data['message'])

# التحقق من حالة الاتصال
def check_connection_status():
	attempts = 0
	while attempts < 20:  # تحقق لمدة 40 ثانية كحد أقصى
		try:
			resp = requests.get('http://localhost:3000/auth/status')
			data = resp.json()

			print(f'Status: {data["status"]} - {data["message"]}')

			if data['status'] == 'connected':
				print('WhatsApp connected! You can send messages now.')
				break

			time.sleep(2)
			attempts += 1
		except Exception as e:
			print('Error checking status:', e)
			time.sleep(2)
			attempts += 1

# استطلاع للحصول على رمز QR
def poll_for_qr_code():
	attempts = 0
	while attempts < 10:  # محاولة 10 مرات كحد أقصى
		time.sleep(2)  # انتظر ثانيتين بين المحاولات
		qr_resp = requests.get('http://localhost:3000/auth/qrcode')
		qr_data = qr_resp.json()

		if qr_data['status'] == 'qr_ready':
			print('QR Code is now ready!')
			qr_base64 = qr_data['qrcode']['base64']
			with open('qrcode_polled.png', 'wb') as f:
				f.write(base64.b64decode(qr_base64))
			print('QR Code saved as qrcode_polled.png')

			# التحقق من حالة الاتصال
			check_connection_status()
			break
		elif qr_data['status'] == 'connected':
			print('WhatsApp is already connected!')
			break

		attempts += 1

# إرسال رسائل متعددة
def send_messages():
	payload = {
	  "to": "971XXXXXXXXX@c.us",
	  "messages": [
		{
		  "type": "text",
		  "body": "مرحبا بالعالم!"
		},
		{
		  "type": "image",
		  "href": "https://example.com/image.jpg",
		  "caption": "صورة جميلة"
		}
	  ]
	}

	resp = requests.post('http://localhost:3000/messages/send', json=payload)
	print(resp.json())

# اختر إحدى الطرق لتنفيذها
get_qr_image_directly()  # طريقة 1: الحصول على صورة QR مباشرة
# init_and_get_qr_as_json()  # طريقة 2: الحصول على QR كـ JSON مع base64
```

## الترخيص

هذا المشروع مرخص بموجب [MIT License](LICENSE).

## تنويه

هذا المشروع غير مرتبط رسميًا بـ WhatsApp أو Facebook. استخدمه على مسؤوليتك الخاصة.
