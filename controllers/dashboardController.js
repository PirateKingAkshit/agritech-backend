const { asyncHandler } = require("../utils/asyncHandler");
const { getDashboardStatsService } = require("../services/dashboardService");

const getDashboardStats = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const data = await getDashboardStatsService(req.user, { from, to });
  res.status(200).json({ message: "Dashboard stats fetched successfully", data });
});

module.exports = { getDashboardStats };


