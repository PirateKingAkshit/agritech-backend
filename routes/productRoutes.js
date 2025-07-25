const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { createMulterInstance } = require("../utils/multerConfig");
const router = express.Router();
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  disableProduct,
  enableProduct,
} = require("../controllers/productMasterController");

// Create Multer instance for ProductMaster
const upload = createMulterInstance({
  allowedTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
  maxFileSize: 2 * 1024 * 1024, // 2MB
  destinationFolder: "uploads/products/",
});

router.post("/", authMiddleware, upload.single("image"), createProduct);
router.get("/", authMiddleware, getAllProducts);
router.get("/:id", authMiddleware, getProductById);
router.put("/:id", authMiddleware, upload.single("image"), updateProduct);
router.delete("/:id", authMiddleware, deleteProduct);
router.put("/disable/:id", authMiddleware, disableProduct);
router.put("/enable/:id", authMiddleware, enableProduct);

module.exports = router;
