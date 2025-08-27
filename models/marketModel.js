const mongoose = require("mongoose");

const marketSchema = new mongoose.Schema({
  name: String,
  district: { type: mongoose.Schema.Types.ObjectId, ref: "District" },
});
module.exports = mongoose.model("Market", marketSchema);
