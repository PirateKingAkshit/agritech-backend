const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  createSaleRequest,
  getMySaleRequests,
  getAllSaleRequests,
  getSaleRequestById,
  updateSaleRequestUser,
  updateSaleRequestStatus,
} = require("../controllers/cropSaleRequestController");

// User routes
router.post("/user", authMiddleware, createSaleRequest);
router.get("/user", authMiddleware, getMySaleRequests);
router.get("/user/:id", authMiddleware, getSaleRequestById);
router.put("/user/:id", authMiddleware, updateSaleRequestUser);

// Admin routes
router.get("/", authMiddleware, getAllSaleRequests);
router.get("/:id", authMiddleware, getSaleRequestById);
router.put("/:id", authMiddleware, updateSaleRequestStatus);

module.exports = router;


