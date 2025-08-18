const express = require("express");
const router = express.Router();
const {
  generateOtpHandler,
  verifyOtpHandler,
  resendOtpHandler,
  registerUser,
  registerSimpleUser,
  updateSimpleUserProfile,
  loginUser,
  getUserProfile,
  getAllUsers,
  getUser,
  updateUserDetails,
  deleteUserAccount,
  enableUserAccount,
  disableUserAccount,
  getUserLoginHistory,
} = require("../controllers/userController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { createMulterInstance } = require("../utils/multerConfig");

// Create Multer instance for CropMaster
const upload = createMulterInstance({
  allowedTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
  maxFileSize: 2 * 1024 * 1024, // 2MB
  destinationFolder: "uploads/users/",
});

router.get("/login-history", authMiddleware, getUserLoginHistory);

router.post("/otp/generate", generateOtpHandler);
router.post("/otp/verify", verifyOtpHandler);
router.post("/otp/resend", resendOtpHandler);
router.post("/register", authMiddleware, upload.single("image"), registerUser);
router.post("/register-user", registerSimpleUser);
router.put("/update-user/:id", authMiddleware, upload.single("image"), updateSimpleUserProfile);
router.post("/login", loginUser);
router.get("/profile", authMiddleware, getUserProfile);
router.get("/", authMiddleware, getAllUsers);
router.get("/:id", authMiddleware, getUser);
router.put("/:id", authMiddleware, upload.single("image"), updateUserDetails);
router.delete("/:id", authMiddleware, deleteUserAccount);
router.put("/:id/enable", authMiddleware, enableUserAccount);
router.put("/:id/disable", authMiddleware, disableUserAccount);

module.exports = router;
