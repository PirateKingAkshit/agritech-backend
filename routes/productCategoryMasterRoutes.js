const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const router = express.Router();
const {
    createProductCategory,
    getAllProductCategories,
    getActiveProductCategoriesPublic,
    getProductCategoryById,
    updateProductCategory,
    deleteProductCategory,
} = require("../controllers/productCategoryMasterController");

router.post("/", authMiddleware, createProductCategory);
router.get("/", authMiddleware, getAllProductCategories);
// Public: active products list (no auth)
router.get("/public/active", getActiveProductCategoriesPublic);
router.get("/:id", authMiddleware, getProductCategoryById);
router.put("/:id", authMiddleware,  updateProductCategory);
router.delete("/:id", authMiddleware, deleteProductCategory);

module.exports = router;
