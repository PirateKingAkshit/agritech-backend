const { asyncHandler } = require("../utils/asyncHandler");
const { getMarketByDistrictIdService } = require("../services/marketService");
const ApiError = require("../utils/error");

const getMarketByDistrictId = asyncHandler(async (req, res) => {
  const districtId = req.params.id;
  if (!districtId) {
    throw new ApiError("District ID is required", 400);
  }
  res.status(200).json({
    message: "Markets fetched successfully",
    data: await getMarketByDistrictIdService(req, res, districtId),
  });
});

module.exports = {
  getMarketByDistrictId,
};
