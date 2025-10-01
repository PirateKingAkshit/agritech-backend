const { asyncHandler } = require("../utils/asyncHandler");
const { getDistrictByStateIdService } = require("../services/districtService");
const ApiError = require("../utils/error");

const getDistrictByStateId = asyncHandler(async (req, res) => {
  const stateId = req.params.id;
  if (!stateId) {
    throw new ApiError("State ID is required", 400);
  }
  res.status(200).json({
    message: "Districts fetched successfully",
    data: await getDistrictByStateIdService(req, res, stateId),
  });
});

module.exports = {
  getDistrictByStateId,
};
