const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  getConversations,
  getMessages,
  createConversation,
  assignConversation,
  updateConversationStatus,
  getUnreadCount,
  getSupportStaff,
  sendMessageFromUser,
  getUserConversation,
} = require("../controllers/chatController");
const {
  chatFileUpload,
  uploadChatFile,
  uploadChatFiles,
  deleteChatFile,
} = require("../controllers/chatFileController");

// All routes require authentication
router.use(authMiddleware);

// Get conversations (role-based)
router.get("/conversations", getConversations);

// Get messages for a conversation
router.get("/conversations/:conversationId/messages", getMessages);

// Create new conversation (users only)
router.post("/conversations", createConversation);

// Assign conversation to support staff (admin/support only)
router.put("/conversations/:conversationId/assign", assignConversation);

// Update conversation status (admin/support only)
router.put("/conversations/:conversationId/status", updateConversationStatus);

// Get unread message count
router.get("/unread-count", getUnreadCount);

// Get support staff list (admin only)
router.get("/support-staff", getSupportStaff);

// Flutter user endpoints
router.post("/user/send-message", sendMessageFromUser);
router.get("/user/conversation", getUserConversation);

// File upload routes
router.post("/upload", authMiddleware, chatFileUpload.single("file"), uploadChatFile);
router.post("/upload-multiple", authMiddleware, chatFileUpload.array("files", 5), uploadChatFiles);
router.delete("/files/:filename", authMiddleware, deleteChatFile);

module.exports = router;
