const Market = require("../models/marketModel");

const getMarketByDistrictIdService = async (req, res, districtId) => {
  return await Market.find({ district: districtId }).populate(
    "district",
    "name"
  );
};

module.exports = { getMarketByDistrictIdService };
