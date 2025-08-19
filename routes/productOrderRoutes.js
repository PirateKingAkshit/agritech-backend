// productOrderRoutes.js
const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  createProductOrder,
  getMyProductOrders,
  getAllProductOrders,
  getProductOrderById,
  updateProductOrderUser,
  updateProductOrderStatus,
} = require("../controllers/productOrderController");

// User routes
router.post("/user", authMiddleware, createProductOrder);
router.get("/user", authMiddleware, getMyProductOrders);
router.get("/user/:id", authMiddleware, getProductOrderById);
router.put("/user/:id", authMiddleware, updateProductOrderUser);

// Admin routes
router.get("/", authMiddleware, getAllProductOrders);
router.get("/:id", authMiddleware, getProductOrderById);
router.put("/:id", authMiddleware, updateProductOrderStatus);

module.exports = router;