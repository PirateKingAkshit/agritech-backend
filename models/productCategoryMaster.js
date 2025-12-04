const mongoose = require("mongoose");

const productCategorySchema = new mongoose.Schema(
  {
    name: { type: String, unique: true },
    deleted_at: { type: Date },
  },
  { timestamps: true }
);
module.exports = mongoose.model("ProductCategory", productCategorySchema);
