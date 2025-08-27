const Commodity = require("../models/commodityModel");

const getCommodityByMarketIdService = async (req, res, marketId) => {
  return await Commodity.find({ market: marketId }).populate("market", "name");
};

module.exports = { getCommodityByMarketIdService };
