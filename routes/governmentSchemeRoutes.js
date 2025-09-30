const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  createScheme,
  getAllSchemes,
  getActiveSchemesPublic,
  getActiveSchemesByIdPublic,
  getSchemeById,
  updateScheme,
  deleteScheme,
  disableScheme,
  enableScheme,
  getTopActiveSchemesPublic,
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
router.get("/public/top-schemes", getTopActiveSchemesPublic);
router.get("/public/active", getActiveSchemesPublic);
router.get("/public/active/:id", getActiveSchemesByIdPublic);
router.get("/:schemeId", authMiddleware, getSchemeById);
router.put("/:id", authMiddleware, upload.any(), updateScheme);
router.delete("/:id", authMiddleware, deleteScheme);
router.put("/disable/:id", authMiddleware, disableScheme);
router.put("/enable/:id", authMiddleware, enableScheme);

module.exports = router;