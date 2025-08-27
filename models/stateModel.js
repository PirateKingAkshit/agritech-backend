const mongoose = require("mongoose");

const stateSchema = new mongoose.Schema({
  name: { type: String, unique: true },
});
module.exports = mongoose.model("State", stateSchema);
