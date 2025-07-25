const mongoose = require("mongoose");

const cropMasterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Crop name is required"],
      trim: true,
      unique: true,
    },
    category: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
    },
    variety: {
      type: String,
      trim: true,
    },
    season: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deleted_at: {
      type: Date,
    },
  },
  { timestamps: true } // Automatically adds created_at and updated_at
);

cropMasterSchema.index({ name: 1, deleted_at: 1 }, { unique: true });  //unique index for name and deleted_at

module.exports = mongoose.model("CropMaster", cropMasterSchema);
