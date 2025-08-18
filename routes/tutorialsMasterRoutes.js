const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  createTutorial,
  getAllTutorials,
  getActiveTutorialsPublic,
  getTutorialById,
  updateTutorial,
  deleteTutorial,
  disableTutorial,
  enableTutorial,
} = require("../controllers/tutorialsMasterController");
const { createMulterInstance } = require("../utils/multerConfig");

// Create Multer instance for CropMaster
const upload = createMulterInstance({
  allowedTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
  maxFileSize: 2 * 1024 * 1024, // 2MB
  destinationFolder: "uploads/tutorials/",
});

router.post("/", authMiddleware, upload.single("image"), createTutorial);
router.get("/", authMiddleware, getAllTutorials);
// Public: active tutorials list (no auth)
router.get("/public/active/:lang", getActiveTutorialsPublic);
router.get("/:id", authMiddleware, getTutorialById);
router.put("/:id", authMiddleware, upload.single("image"), updateTutorial);
router.delete("/:id", authMiddleware, deleteTutorial);
router.put("/disable/:id", authMiddleware, disableTutorial);
router.put("/enable/:id", authMiddleware, enableTutorial);

module.exports = router;
