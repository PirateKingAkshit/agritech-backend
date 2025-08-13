const mongoose = require("mongoose");

const productOrderSchema = new mongoose.Schema(
  {
    orderId: {
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
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ProductMaster",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [0, "Quantity must be non-negative"],
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
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
      min: [0, "Total price must be non-negative"],
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
      index: true,
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


