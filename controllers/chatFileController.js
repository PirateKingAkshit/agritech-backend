const { createMulterInstance } = require("../utils/multerConfig");
const { asyncHandler } = require("../utils/asyncHandler");
const ApiError = require("../utils/error");
const path = require("path");
const fs = require("fs");

// Multer configuration for chat files
const chatFileUpload = createMulterInstance({
  allowedTypes: [
    "image/jpeg",
    "image/jpg", 
    "image/png",
    "image/gif",
    "image/webp",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/m4a",
    "video/mp4",
    "video/avi",
    "video/mov",
    "video/wmv",
    "video/webm"
  ],
  maxFileSize: 50 * 1024 * 1024, // 50MB
  destinationFolder: "uploads/support",
});

// Handle single file upload for chat
const uploadChatFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError("No file uploaded", 400);
  }

  const fileUrl = `/uploads/support/${req.file.filename}`;
  
  res.status(200).json({
    success: true,
    data: {
      fileUrl,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    },
  });
});

// Handle multiple file upload for chat
const uploadChatFiles = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError("No files uploaded", 400);
  }

  const uploadedFiles = req.files.map(file => ({
    fileUrl: `/uploads/support/${file.filename}`,
    fileName: file.filename,
    originalName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
  }));

  res.status(200).json({
    success: true,
    data: uploadedFiles,
  });
});

// Delete chat file
const deleteChatFile = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, "../uploads/support", filename);

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.status(200).json({
        success: true,
        message: "File deleted successfully",
      });
    } else {
      throw new ApiError("File not found", 404);
    }
  } catch (error) {
    throw new ApiError("Failed to delete file", 500);
  }
});

module.exports = {
  chatFileUpload,
  uploadChatFile,
  uploadChatFiles,
  deleteChatFile,
};
