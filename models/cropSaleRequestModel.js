const mongoose = require("mongoose");

const cropSaleRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    cropId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CropMaster",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, "Quantity must be non-negative"],
    },
    quantity_unit: {
      type: String,
      required: true,
      trim: true,
    },
    price_per_unit: {
      type: Number,
      // optional now
      min: [0, "Price per unit must be non-negative"],
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Completed"],
      default: "Pending",
      index: true,
    },
    ready_to_sell_on: {
      type: Date,
      required: true
    },
    deleted_at: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CropSaleRequest", cropSaleRequestSchema);


