const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateCreateMedia,
  handleValidationErrors,
} = require("../utils/validator"); // Assume you create this validator similar to CropMaster
const {
  createMediaService,
  getAllMediaService,
  getMediaByIdService,
  deleteMediaService,
} = require("../services/mediaMasterService");

const createMedia = asyncHandler(async (req, res) => {
  const files = req.files; // Array of uploaded files
  const { type } = req.body; // Type applies to all files
  if (!files || files.length === 0) {
    throw new Error("No files uploaded", 400);
  }
  const mediaItems = await createMediaService(files, type, req.user);
  res.status(200).json({ message: "Media uploaded successfully", data: mediaItems });
});

const getAllMedia = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, q = "", type = "" } = req.query;
  const result = await getAllMediaService(parseInt(page), parseInt(limit), q, type);
  res.status(200).json(result);
});

const getMediaById = asyncHandler(async (req, res) => {
  const media = await getMediaByIdService(req.params.id);
  res.status(200).json({ message: "Media fetched successfully", data: media });
});

const deleteMedia = asyncHandler(async (req, res) => {
  const media = await deleteMediaService(req.params.id, req.user);
  res.status(200).json({ message: "Media deleted successfully", data: media });
});

module.exports = {
  createMedia,
  getAllMedia,
  getMediaById,
  deleteMedia,
};
