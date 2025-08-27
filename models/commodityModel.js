const mongoose = require("mongoose");

const commoditySchema = new mongoose.Schema({
  name: String,
  market: { type: mongoose.Schema.Types.ObjectId, ref: "Market" },
});
module.exports = mongoose.model("Commodity", commoditySchema);
