const MediaMaster = require("../models/mediaMaster");
const Error = require("../utils/error");
const fs = require("fs").promises;
const path = require("path");

const createMediaService = async (files, type, requestUser) => {
  if (requestUser.role !== "Admin") {
    throw new Error("Unauthorized", 403);
  }
  const mediaItems = [];
  const baseUrl = `http://localhost:${process.env.PORT || 5000}`;
  
  for (const file of files) {
    // Normalize the file path to use forward slashes for URLs
    const normalizedPath = file.path.replace(/\\/g, '/');
    
    const mediaData = {
      name: file.originalname, // Original filename
      type, // Type from req.body
      url: `${baseUrl}/${normalizedPath}`, // Full URL path with normalized slashes
      format: file.mimetype, // MIME type (e.g., "image/jpeg")
      size: file.size, // Size in bytes
    };
    const media = new MediaMaster(mediaData);
    await media.save();
    mediaItems.push(media);
  }
  return mediaItems;
};

// The following functions remain unchanged
const getAllMediaService = async (page, limit, search, type) => {
  const skip = (page - 1) * limit;
  const query = {
    $or: [
      { name: { $regex: search, $options: "i" } },
      { type: { $regex: search, $options: "i" } },
    ],
  };
  if (type) {
    query.type = type;
  }
  const count = await MediaMaster.countDocuments(query);
  const media = await MediaMaster.find(query)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
  const totalPages = Math.ceil(count / limit);
  return {
    data: media,
    pagination: { currentPage: page, totalPages, totalItems: count, limit },
  };
};

const getMediaByIdService = async (id) => {
  const media = await MediaMaster.findById(id);
  if (!media) {
    throw new Error("Media not found", 404);
  }
  return media;
};

const deleteMediaService = async (id, requestUser) => {
  if (requestUser.role !== "Admin") {
    throw new Error("Unauthorized", 403);
  }
  const media = await MediaMaster.findById(id);
  if (!media) {
    throw new Error("Media not found", 404);
  }
  // Delete the associated file
  if (media.url) {
    try {
      await fs.unlink(path.resolve(__dirname, "../", media.url.replace("http://localhost:5000/","")));
    } catch (error) {
      console.error(`Failed to delete file: ${media.url}`, error);
      // Continue with DB delete even if file delete fails
    }
  }
  await MediaMaster.deleteOne({ _id: id }); // Hard delete
  return media; // Return the deleted media details
};

module.exports = {
  createMediaService,
  getAllMediaService,
  getMediaByIdService,
  deleteMediaService,
};
