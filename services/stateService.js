const State = require("../models/stateModel");

const getAllStatesService = async (req, res) => {
  return await State.find({});
};

module.exports = { getAllStatesService };
