const { getMandiPriceService } = require("../services/mandiPriceService");
const { asyncHandler } = require("../utils/asyncHandler");

const getMandiPrice = asyncHandler(async (req, res) => {
  res.status(200).json({
    message: "Mandi price fetched successfully",
    data: await getMandiPriceService(req, res),
  });
});

module.exports = { getMandiPrice };
