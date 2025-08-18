const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  createScheme,
  getAllSchemes,
  getActiveSchemesPublic,
  getSchemeById,
  updateScheme,
  deleteScheme,
  disableScheme,
  enableScheme,
} = require("../controllers/governmentSchemeController");
const { createMulterInstance } = require("../utils/multerConfig");

const upload = createMulterInstance({
  allowedTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
  maxFileSize: 2 * 1024 * 1024, // 2MB
  destinationFolder: "uploads/schemes/",
});

router.post("/", authMiddleware, upload.any(), createScheme);
router.get("/", authMiddleware, getAllSchemes);
// Public: active schemes list (no auth)
router.get("/public/active/:lang", getActiveSchemesPublic);
router.get("/:schemeId", authMiddleware, getSchemeById);
router.put("/:id", authMiddleware, upload.any(), updateScheme);
router.delete("/:id", authMiddleware, deleteScheme);
router.put("/disable/:id", authMiddleware, disableScheme);
router.put("/enable/:id", authMiddleware, enableScheme);

module.exports = router;