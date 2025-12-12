const Commodity = require("../models/commodityModel");
const { translateObjectFields } = require("../utils/translateUtil");

const getCommodityByMarketIdService = async (req, res, marketId) => {
  const {language= "en"} = req.query
  const commodities = await Commodity.find({ market: marketId }).populate("market", "name").lean().sort({ name: 1 });

  const fieldsToTranslate = ["name","market.name"];
  const translatedCommodities = await Promise.all(
    commodities.map(async (commodity) => {
      return await translateObjectFields(commodity, fieldsToTranslate, language);
    })
  );

  return translatedCommodities;
};

module.exports = { getCommodityByMarketIdService };
