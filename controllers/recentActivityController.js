const { asyncHandler } = require("../utils/asyncHandler");
const {getLatestUserActivityService} = require('../services/recentActivityService')

const getLatestUserActivity = asyncHandler(async (req, res) => {
  const result = await getLatestUserActivityService(req.user);
  res.status(200).json(result);
});

module.exports = {getLatestUserActivity}