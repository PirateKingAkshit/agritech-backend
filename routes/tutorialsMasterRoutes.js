const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  createTutorial,
  getAllTutorials,
  getTutorialById,
  updateTutorial,
  deleteTutorial,
  disableTutorial,
  enableTutorial,
} = require("../controllers/tutorialsMasterController");

router.post("/", authMiddleware, createTutorial);
router.get("/", authMiddleware, getAllTutorials);
router.get("/:id", authMiddleware, getTutorialById);
router.put("/:id", authMiddleware, updateTutorial);
router.delete("/:id", authMiddleware, deleteTutorial);
router.put("/disable/:id", authMiddleware, disableTutorial);
router.put("/enable/:id", authMiddleware, enableTutorial);

module.exports = router;
