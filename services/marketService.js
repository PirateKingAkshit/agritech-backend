const Market = require("../models/marketModel");
const { translateObjectFields } = require("../utils/translateUtil");

const getMarketByDistrictIdService = async (req, res, districtId) => {
  const { language = "en" } = req.query;
  
  const markets = await Market.find({ district: districtId }).populate(
    "district",
    "name"
  ).lean();

  const fieldsToTranslate = ["name","district.name"];
  const translatedMarkets = await Promise.all(
    markets.map(async (market) => {
      return await translateObjectFields(market, fieldsToTranslate, language);
    })
  );

  return translatedMarkets;
};

module.exports = { getMarketByDistrictIdService };
