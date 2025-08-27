const { asyncHandler } = require("../utils/asyncHandler");
const { getAllStatesService } = require("../services/stateService");

const getAllStates = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json({
      message: "States fetched successfully",
      data: await getAllStatesService(req, res),
    });
});

module.exports = {
  getAllStates,
};
