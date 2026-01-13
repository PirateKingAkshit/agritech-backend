const mongoose = require("mongoose");

const tutorialsMasterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tutorial name is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    descriptionWeb: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      required: [true, "Language is required"],
      trim: true,
    },
    image: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deleted_at: {
      type: Date,
    },
  },
  { timestamps: true }
);

tutorialsMasterSchema.index({ name: 1, deleted_at: 1 }, { unique: true });

module.exports = mongoose.model("TutorialsMaster", tutorialsMasterSchema);
