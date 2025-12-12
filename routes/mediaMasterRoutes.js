const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  createMedia,
  getAllMedia,
  getMediaById,
  deleteMedia,
} = require("../controllers/mediaMasterController");
const { createMulterInstance } = require("../utils/multerConfig");
const {
  validateCreateMedia,
  handleValidationErrors,
} = require("../utils/validator");

// Create Multer instance for MediaMaster (supports multiple file types)
const upload = createMulterInstance({
  allowedTypes: [
    "image/png", "image/jpeg", "image/jpg", "image/webp", // Images
    "video/mp4", "video/mpeg", "video/quicktime", // Videos
    "audio/mpeg", "audio/wav", "audio/ogg", // Audio
    "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // Documents (PDF, DOC, DOCX)
  ],
  maxFileSize: 30 * 1024 * 1024, // 10MB per file
  destinationFolder: "uploads/media/",
});

// Routes
router.post("/", authMiddleware, upload.array("media", 10), validateCreateMedia, handleValidationErrors, createMedia);
router.get("/", authMiddleware, getAllMedia);
router.get("/:id", authMiddleware, getMediaById);
router.delete("/:id", authMiddleware, deleteMedia);

module.exports = router;
