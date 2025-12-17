/**
 * ============================================
 * CHAT ROUTES
 * ============================================
 * 
 * PURPOSE:
 * Defines all REST API endpoints for the chat system.
 * These are HTTP endpoints used by Flutter and Next.js frontends.
 * 
 * ROUTE PREFIX: /api/v1/chat
 * (All routes below are prefixed with /api/v1/chat in app.js)
 * 
 * AUTHENTICATION:
 * All routes require valid JWT token in Authorization header
 * 
 * USED BY:
 * - Flutter mobile app (User/farmers)
 * - Next.js web dashboard (Support/Admin)
 * 
 * NOTE:
 * Real-time messaging uses Socket.IO (see chatSocket.js)
 * These HTTP routes are for:
 * - Initial data loading
 * - Pagination
 * - Non-real-time operations
 */

const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const { createMulterInstance } = require("../utils/multerConfig");
const {
  // Conversation-related controllers
  createOrGetConversation,
  getMyConversations,
  getConversationById,
  updateConversationStatus,
  deleteConversation,
  
  // Message-related controllers
  sendMessage,
  getMessages,
  markMessageAsRead,
  markConversationAsRead,
  deleteMessage,
  
  // Media upload controller
  uploadChatMedia,
  
  // Support/Admin specific controllers
  getAllConversationsForSupport,
  reassignConversation,
  getConversationStats,
} = require("../controllers/chatController");

// ========================================
// MULTER CONFIGURATION FOR CHAT MEDIA
// ========================================

/**
 * Creates Multer instance specifically for chat media uploads
 * 
 * Configuration:
 * - Allowed types: images, videos, audio (no documents in chat)
 * - Max file size: 10MB per file
 * - Destination: uploads/chat/ folder
 * - File naming: Automatic unique names (handled by multerConfig)
 * 
 * Used in: POST /media route (upload before sending message)
 */
const chatMediaUpload = createMulterInstance({
  allowedTypes: [
    // Image formats
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    
    // Video formats
    "video/mp4",
    "video/mpeg",
    "video/quicktime", // MOV files
    
    // Audio formats
    "audio/mpeg",   // MP3
    "audio/mp4",    // M4A
    "audio/x-m4a",  // M4A (iOS)
    "audio/wav",
    "audio/ogg",
    
  ],
  maxFileSize: 10 * 1024 * 1024, // 10MB in bytes
  destinationFolder: "uploads/chat/", // Separate folder for chat media
});

// ========================================
// CONVERSATION ROUTES
// ========================================

/**
 * POST /api/v1/chat/conversations
 * 
 * Create new conversation or get existing one
 * 
 * WHEN TO CALL:
 * - User clicks "Contact Support" button in app
 * - Checks if conversation already exists between user and support
 * - If exists: returns existing conversation
 * - If not: creates new conversation with assigned support
 * 
 * REQUEST BODY: None (user ID comes from auth token)
 * 
 * RESPONSE: Conversation object with IDs and details
 * 
 * WHO CAN CALL: User (farmers)
 */
router.post(
  "/conversations",
  authMiddleware, // Ensures user is authenticated
  createOrGetConversation
);

/**
 * GET /api/v1/chat/conversations
 * 
 * Get list of all conversations for logged-in user
 * 
 * WHEN TO CALL:
 * - User opens app (to show conversation list)
 * - Support opens dashboard (to see assigned chats)
 * 
 * QUERY PARAMS:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - status: Filter by status (optional: "open", "waiting", "resolved", "closed")
 * 
 * RESPONSE: Array of conversations with pagination info
 * 
 * WHO CAN CALL: User, Support, Admin
 * - User sees: Their own conversations
 * - Support sees: Conversations assigned to them
 * - Admin sees: All conversations (override)
 */
router.get(
  "/conversations",
  authMiddleware,
  getMyConversations
);

/**
 * GET /api/v1/chat/conversations/:id
 * 
 * Get details of a specific conversation
 * 
 * WHEN TO CALL:
 * - User clicks on a conversation to open chat
 * - Need full conversation details with participant info
 * 
 * URL PARAMS:
 * - id: Conversation ID
 * 
 * RESPONSE: Full conversation object with populated user details
 * 
 * WHO CAN CALL: Participants of the conversation only
 */
router.get(
  "/conversations/:id",
  authMiddleware,
  getConversationById
);

/**
 * PATCH /api/v1/chat/conversations/:id/status
 * 
 * Update conversation status
 * 
 * WHEN TO CALL:
 * - Support marks conversation as "resolved"
 * - Admin closes old conversations
 * 
 * URL PARAMS:
 * - id: Conversation ID
 * 
 * REQUEST BODY:
 * - status: New status ("open", "waiting", "resolved", "closed")
 * 
 * WHO CAN CALL: Support, Admin (not User)
 */
router.patch(
  "/conversations/:id/status",
  authMiddleware,
  updateConversationStatus
);

/**
 * DELETE /api/v1/chat/conversations/:id
 * 
 * Soft delete a conversation (sets isActive to false)
 * 
 * WHEN TO CALL:
 * - User wants to remove conversation from their list
 * - Admin archives old conversations
 * 
 * NOTE: Doesn't permanently delete, just hides from view
 * 
 * WHO CAN CALL: User (their own), Admin (any)
 */
router.delete(
  "/conversations/:id",
  authMiddleware,
  deleteConversation
);

// ========================================
// MESSAGE ROUTES
// ========================================

/**
 * POST /api/v1/chat/messages
 * 
 * Send a new message in a conversation
 * 
 * WHEN TO CALL:
 * - User types message and clicks send
 * - Support responds to user query
 * 
 * NOTE: For real-time chat, use Socket.IO instead (faster)
 * This HTTP endpoint is fallback if Socket.IO unavailable
 * 
 * REQUEST BODY:
 * - conversationId: ID of conversation
 * - messageType: "text", "image", "audio", or "video"
 * - content: Message text (required if type is "text")
 * - mediaId: Media ID (required if type is image/audio/video)
 * 
 * PROCESS:
 * 1. If sending media: First upload file to /media endpoint
 * 2. Get mediaId from upload response
 * 3. Send message with mediaId
 * 
 * WHO CAN CALL: Participants of the conversation
 */
router.post(
  "/messages",
  authMiddleware,
  sendMessage
);

/**
 * GET /api/v1/chat/messages/:conversationId
 * 
 * Get message history for a conversation
 * 
 * WHEN TO CALL:
 * - User opens a conversation (load initial messages)
 * - User scrolls up to load older messages (pagination)
 * 
 * URL PARAMS:
 * - conversationId: ID of conversation
 * 
 * QUERY PARAMS:
 * - page: Page number (default: 1)
 * - limit: Messages per page (default: 50)
 * 
 * RESPONSE: Array of messages (oldest to newest) with pagination
 * 
 * WHO CAN CALL: Participants of the conversation only
 */
router.get(
  "/messages/:conversationId",
  authMiddleware,
  getMessages
);

/**
 * PATCH /api/v1/chat/messages/:messageId/read
 * 
 * Mark a single message as read
 * 
 * WHEN TO CALL:
 * - User views a message in chat
 * 
 * NOTE: For real-time, Socket.IO automatically handles this
 * This HTTP endpoint is for cases where Socket.IO isn't available
 * 
 * WHO CAN CALL: Recipient of the message (not sender)
 */
router.patch(
  "/messages/:messageId/read",
  authMiddleware,
  markMessageAsRead
);

/**
 * PATCH /api/v1/chat/conversations/:conversationId/read
 * 
 * Mark ALL messages in conversation as read
 * 
 * WHEN TO CALL:
 * - User opens conversation and sees all messages
 * - More efficient than marking each message individually
 * 
 * WHO CAN CALL: Participant of the conversation
 */
router.patch(
  "/conversations/:conversationId/read",
  authMiddleware,
  markConversationAsRead
);

/**
 * DELETE /api/v1/chat/messages/:messageId
 * 
 * Delete a message
 * 
 * WHEN TO CALL:
 * - User wants to delete their sent message
 * - Admin removes inappropriate content
 * 
 * NOTE: Hard delete (permanently removes from database)
 * 
 * WHO CAN CALL: Message sender, Admin
 */
router.delete(
  "/messages/:messageId",
  authMiddleware,
  deleteMessage
);

// ========================================
// MEDIA UPLOAD ROUTE
// ========================================

/**
 * POST /api/v1/chat/media
 * 
 * Upload media files for chat (images, videos, audio)
 * 
 * WHEN TO CALL:
 * - Before sending a media message
 * - User selects image/video/audio to send
 * 
 * PROCESS FLOW:
 * 1. User selects file in app
 * 2. App calls this endpoint to upload file
 * 3. Server saves file and returns mediaId
 * 4. App sends message with messageType + mediaId
 * 
 * REQUEST:
 * - Form-data with "media" field (can be multiple files)
 * - Content-Type: multipart/form-data
 * 
 * RESPONSE:
 * - Array of media objects with IDs and URLs
 * 
 * WHO CAN CALL: User, Support, Admin (anyone authenticated)
 */
router.post(
  "/media",
  authMiddleware,
  chatMediaUpload.array("media", 5), // Allow up to 5 files at once
  uploadChatMedia
);

// ========================================
// SUPPORT/ADMIN SPECIFIC ROUTES
// ========================================

/**
 * GET /api/v1/chat/support/conversations
 * 
 * Get ALL conversations in the system (for support dashboard)
 * 
 * WHEN TO CALL:
 * - Support/Admin opens dashboard to see all chats
 * - View pending conversations needing response
 * 
 * QUERY PARAMS:
 * - page, limit: Pagination
 * - status: Filter by status
 * - assignedTo: Filter by assigned support agent (Admin only)
 * 
 * WHO CAN CALL: Support, Admin only
 */
router.get(
  "/support/conversations",
  authMiddleware,
  getAllConversationsForSupport
);

/**
 * POST /api/v1/chat/support/reassign
 * 
 * Reassign conversation to another support agent
 * 
 * WHEN TO CALL:
 * - Admin transfers chat from Support Agent 1 to Support Agent 2
 * - Load balancing between support agents
 * 
 * REQUEST BODY:
 * - conversationId: ID of conversation to reassign
 * - newSupportId: ID of new support agent
 * 
 * WHO CAN CALL: Admin only
 */
router.post(
  "/support/reassign",
  authMiddleware,
  reassignConversation
);

/**
 * GET /api/v1/chat/support/stats
 * 
 * Get statistics for support dashboard
 * 
 * RETURNS:
 * - Total conversations
 * - Active conversations
 * - Conversations by status
 * - Average response time
 * - Per-agent statistics (for multiple support)
 * 
 * WHEN TO CALL:
 * - Loading support dashboard
 * - Generating reports
 * 
 * WHO CAN CALL: Support, Admin
 */
router.get(
  "/support/stats",
  authMiddleware,
  getConversationStats
);

// ========================================
// EXPORT ROUTER
// ========================================

module.exports = router;
