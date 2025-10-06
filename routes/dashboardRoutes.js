const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { getDashboardStats, searchDashboard } = require("../controllers/dashboardController");

const router = express.Router();

router.get("/stats", authMiddleware, getDashboardStats);
router.get("/search", searchDashboard);

module.exports = router;


