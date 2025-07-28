const mongoose = require("mongoose");

const governmentSchemeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Scheme name is required"],
      trim: true,
    },
    schemeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deleted_at: {
      type: Date,
    },
    translation: [
      {
        name: {
          type: String,
          required: [true, "Translation name is required"],
          trim: true,
        },
        image: {
          type: String,
          required: [true, "Translation image is required"],
        },
        description: {
          type: String,
          trim: true,
        },
        language: {
          type: String,
          required: [true, "Translation language is required"],
          trim: true,
        },
      },
    ],
  },
  { timestamps: true }
);

governmentSchemeSchema.index(
  { schemeId: 1, "translation.language": 1, deleted_at: 1 },
  {
    unique: true,
    partialFilterExpression: { deleted_at: null },
  }
);

module.exports = mongoose.model("GovernmentScheme", governmentSchemeSchema);