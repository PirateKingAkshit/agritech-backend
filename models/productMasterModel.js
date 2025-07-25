const mongoose = require("mongoose");

const productMasterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      unique: true,
    },
    skuCode: {
      type: String,
      trim: true,
      required: [true, "Product sku code is required"],
      unique: true,
    },
    unit: {
      type: String,
      trim: true,
      required: [true, "Product unit is required"],
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
    },
    category: {
      type: String,
      trim: true,
      required: [true, "Product category is required"],
    },
    description: {
      type: String,
      trim: true,
      required: [true, "Product description is required"],
    },
    image: {
      type: String,
      required: [true, "Product image is required"],
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

productMasterSchema.index({ name: 1, deleted_at: 1, skuCode: 1 }, { unique: true });  //unique index for name, skuCode and deleted_at

module.exports = mongoose.model("ProductMaster", productMasterSchema);
