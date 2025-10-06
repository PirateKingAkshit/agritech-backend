const { asyncHandler } = require("../utils/asyncHandler");
const { getDashboardStatsService, searchDashboardService } = require("../services/dashboardService");

const getDashboardStats = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const data = await getDashboardStatsService(req.user, { from, to });
  res.status(200).json({ message: "Dashboard stats fetched successfully", data });
});

module.exports = { getDashboardStats };

const searchDashboard = asyncHandler(async (req, res) => {
  const { q, lang } = req.query;
  const data = await searchDashboardService(req.user, q || "", lang || "");
  res.status(200).json({ message: "Search results fetched successfully", data });
});

module.exports.searchDashboard = searchDashboard;


