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
      type: mongoose.Schema.Types.ObjectId,
      ref: "CropMaster",
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      default: null,
    },
    variety: {
      type: String,
      trim: true,
      default: "",
    },
    season: {
      type: String,
      trim: true,
      default: "",
    },
    max_price: {
      type: Number,
      default: 0,
      min: [0, "Max price cannot be negative"],
    },
    min_price: {
      type: Number,
      default: 0,
      min: [0, "Min price cannot be negative"],
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

cropMasterSchema.index({ name: 1, deleted_at: 1 }, { unique: true }); //unique index for name and deleted_at

module.exports = mongoose.model("CropMaster", cropMasterSchema);
