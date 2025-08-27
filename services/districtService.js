const District = require("../models/districtModel");

const getDistrictByStateIdService = async (req, res, stateId) => {
  return await District.find({ state: stateId }).populate("state", "name");
};

module.exports = { getDistrictByStateIdService };
