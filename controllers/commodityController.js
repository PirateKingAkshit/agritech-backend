const { asyncHandler } = require("../utils/asyncHandler");
const {
  getCommodityByMarketIdService,
} = require("../services/commodityService");
const ApiError = require("../utils/error");

const getCommodityByMarketId = asyncHandler(async (req, res) => {
  const marketId = req.params.id;
  if (!marketId) {
    throw new ApiError("Market ID is required", 400);
  }
  res.status(200).json({
    message: "Commodities fetched successfully",
    data: await getCommodityByMarketIdService(req, res, marketId),
  });
});

module.exports = {
  getCommodityByMarketId,
};
