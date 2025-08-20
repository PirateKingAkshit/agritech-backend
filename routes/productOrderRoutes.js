const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderUser,
  updateOrderStatus,
} = require("../controllers/productOrderController");

// User routes
router.post("/user", authMiddleware, createOrder);
router.get("/user", authMiddleware, getMyOrders);
router.get("/user/:id", authMiddleware, getOrderById);
router.put("/user/:id", authMiddleware, updateOrderUser);

// Admin routes
router.get("/", authMiddleware, getAllOrders);
router.get("/:id", authMiddleware, getOrderById);
router.put("/:id", authMiddleware, updateOrderStatus);

module.exports = router;

