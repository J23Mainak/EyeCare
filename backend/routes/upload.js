import dotenv from "dotenv";
dotenv.config();

import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Debug: Check if env variables are loaded
console.log("\n=== CLOUDINARY CONFIG DEBUG ===");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME || "NOT SET");
console.log(
  "API Key:",
  process.env.CLOUDINARY_API_KEY
    ? "SET (length: " + process.env.CLOUDINARY_API_KEY.length + ")"
    : "NOT SET"
);
console.log(
  "API Secret:",
  process.env.CLOUDINARY_API_SECRET
    ? "SET (length: " + process.env.CLOUDINARY_API_SECRET.length + ")"
    : "NOT SET"
);
console.log("================================\n");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Verify config
const config = cloudinary.config();
console.log("Cloudinary config loaded:", {
  cloud_name: config.cloud_name || "MISSING",
  api_key: config.api_key ? "SET" : "MISSING",
  api_secret: config.api_secret ? "SET" : "MISSING",
});

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// @route   POST /api/upload/image
// @desc    Upload image to Cloudinary
// @access  Private
router.post("/image", auth, upload.single("image"), async (req, res) => {
  try {
    console.log("Upload request received");

    if (!req.file) {
      console.log("No file in request");
      return res.status(400).json({ error: "No image file provided" });
    }

    console.log(
      "File received:",
      req.file.originalname,
      req.file.size,
      "bytes"
    );

    // Convert buffer to base64
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    console.log("Uploading to Cloudinary...");

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "clarity-retina-care",
      resource_type: "auto",
      transformation: [
        { width: 800, height: 600, crop: "limit" },
        { quality: "auto" },
      ],
    });

    console.log("Cloudinary upload success:", result.secure_url);

    res.json({
      message: "Image uploaded successfully",
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    console.error("Image upload error:", error.message);
    console.error("Error details:", error);
    res.status(500).json({
      error: "Server error while uploading image",
      details: error.message,
    });
  }
});

// @route   POST /api/upload/profile-image
// @desc    Upload profile image
// @access  Private
router.post(
  "/profile-image",
  auth,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;

      const result = await cloudinary.uploader.upload(dataURI, {
        folder: "clarity-retina-care/profiles",
        resource_type: "auto",
        transformation: [
          { width: 400, height: 400, crop: "fill", gravity: "face" },
          { quality: "auto" },
        ],
      });

      res.json({
        message: "Profile image uploaded successfully",
        url: result.secure_url,
        publicId: result.public_id,
      });
    } catch (error) {
      console.error("Profile image upload error:", error);
      res
        .status(500)
        .json({ error: "Server error while uploading profile image" });
    }
  }
);

// @route   DELETE /api/upload/:publicId
// @desc    Delete image from Cloudinary
// @access  Private
router.delete("/:publicId", auth, async (req, res) => {
  try {
    const { publicId } = req.params;
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      res.json({ message: "Image deleted successfully" });
    } else {
      res.status(400).json({ error: "Failed to delete image" });
    }
  } catch (error) {
    console.error("Image deletion error:", error);
    res.status(500).json({ error: "Server error while deleting image" });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "File size too large. Maximum size is 5MB." });
    }
    return res.status(400).json({ error: "File upload error" });
  }

  if (error.message === "Only image files are allowed") {
    return res.status(400).json({ error: error.message });
  }

  next(error);
});

export default router;
