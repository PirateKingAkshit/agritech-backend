const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  createCrop,
  getAllCrops,
  getActiveCropsPublic,
  getCropById,
  updateCrop,
  deleteCrop,
  disableCrop,
  enableCrop,
  getParentCrops,
  getParentsCropPublic,
  getChildCropPublic,
} = require("../controllers/cropMasterController");
const { createMulterInstance } = require("../utils/multerConfig");

// Create Multer instance for CropMaster
const upload = createMulterInstance({
  allowedTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
  maxFileSize: 2 * 1024 * 1024, // 2MB
  destinationFolder: "uploads/crops/",
});

router.post("/", authMiddleware, upload.single("image"), createCrop);
router.get("/", authMiddleware, getAllCrops);
// Get parent crops (crops where category is null)
router.get("/parent-crops", authMiddleware, getParentCrops);
// Public: active crops list (no auth)
router.get("/public/active", getActiveCropsPublic);
// Public: parent crops list (no auth)
router.get("/public/parents", getParentsCropPublic);
// Public: child crops by parentId (no auth)
router.get("/public/children/:parentId", getChildCropPublic);
router.get("/:id", authMiddleware, getCropById);
router.put("/:id", authMiddleware, upload.single("image"), updateCrop);
router.delete("/:id", authMiddleware, deleteCrop);
router.put("/disable/:id", authMiddleware, disableCrop);
router.put("/enable/:id", authMiddleware, enableCrop);

module.exports = router;
