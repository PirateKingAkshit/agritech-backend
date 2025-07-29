const mongoose = require("mongoose");

const mediaMasterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
    },
    type: {
      type: String,
      required: [true, "Media type is required"],
      enum: ["video", "audio", "image", "documents"], // Restricted to specified types
      trim: true,
    },
    url: {
      type: String,
      required: [true, "URL (file path) is required"],
    },
    format: {
      type: String,
      required: [true, "File format is required"], // e.g., "image/jpeg"
    },
    size: {
      type: Number,
      required: [true, "File size is required"], // in bytes
      min: [0, "Size must be non-negative"],
    },
  },
  { timestamps: true } // Automatically adds created_at and updated_at
);

// No unique index on name, as multiple files can have the same original name
module.exports = mongoose.model("MediaMaster", mediaMasterSchema);
