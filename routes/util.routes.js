const express = require("express");
const router = express.Router();
const axios = require("axios");
const sharp = require("sharp");
const FormData = require("form-data");

require("dotenv").config();

module.exports = () => {
	// Function to crop bottom 20px and convert to data URL
	async function cropBottom20pxToDataURL(imageUrl) {
		try {
			// Download image as buffer
			const response = await axios.get(imageUrl, {
				responseType: "arraybuffer",
			});
			const imageBuffer = Buffer.from(response.data);

			// Get original image dimensions
			const metadata = await sharp(imageBuffer).metadata();
			const { width, height, format } = metadata;

			// Crop 20px from the bottom
			const croppedBuffer = await sharp(imageBuffer)
				.extract({ left: 0, top: 0, width, height: height - 20 })
				.toBuffer();

			// Convert to Data URL
			const base64 = croppedBuffer.toString("base64");
			const mimeType = `image/${format}`;
			return `data:${mimeType};base64,${base64}`;
		} catch (err) {
			console.error("Error cropping image:", err.message);
			return null;
		}
	}

	// Function to upload to ImgBB
	async function uploadToImgBB(base64Image) {
		const base64Data = base64Image.split(",")[1]; // remove "data:image/jpeg;base64,"

		try {
			const formData = new FormData();
			formData.append("key", process.env.IMGBB_API_KEY);
			formData.append("image", base64Data);

			const response = await axios.post(
				"https://api.imgbb.com/1/upload",
				formData,
				{
					headers: {
						...formData.getHeaders(),
					},
				},
			);

			return response.data.data.url;
		} catch (error) {
			console.error(
				"Error uploading to ImgBB:",
				error.response?.data || error.message,
			);
			return null;
		}
	}

	// POST endpoint to crop image and return URL
	router.post("/crop_img", async (req, res) => {
		try {
			const { imageUrl } = req.body;

			if (!imageUrl) {
				return res.status(400).json({ error: "Image URL is required" });
			}

			// Crop image and get data URL
			const croppedDataUrl = await cropBottom20pxToDataURL(imageUrl);

			if (!croppedDataUrl) {
				return res.status(500).json({ error: "Failed to crop image" });
			}

			// Upload to ImgBB
			const uploadedUrl = await uploadToImgBB(croppedDataUrl);

			if (!uploadedUrl) {
				return res
					.status(500)
					.json({ error: "Failed to upload cropped image" });
			}

			res.json({
				success: true,
				url: uploadedUrl,
			});
		} catch (error) {
			console.error("Error processing image:", error);
			res.status(500).json({
				error: "Internal server error",
				message: error.message,
			});
		}
	});

	return router;
};
