const mongoose = require('mongoose');

const cropMasterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Crop name is required'],
      trim: true,
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
      type: String, // Path to the uploaded image
    },
    variety: {
      type: String,
      trim: true,
    },
    season: {
      type: String,
      trim: true,
    },
    deleted_at: {
      type: Date,
    },
  },
  { timestamps: true } // Automatically adds created_at and updated_at
);

module.exports = mongoose.model('CropMaster', cropMasterSchema);