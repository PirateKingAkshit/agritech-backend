// productOrderModel.js
const mongoose = require("mongoose");

const productOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductMaster",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, "Quantity must be non-negative"],
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
      index: true,
    },
    pricePerUnit: {
      type: Number,
      required: true,
      min: [0, "Price per unit must be non-negative"],
    },
    subTotal: {
      type: Number,
      required: true,
      min: [0, "Subtotal must be non-negative"],
    },
    deleted_at: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProductOrder", productOrderSchema);
