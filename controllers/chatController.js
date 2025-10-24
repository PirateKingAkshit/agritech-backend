/**
 * ============================================
 * CHAT CONTROLLER
 * ============================================
 * 
 * PURPOSE:
 * Handles all HTTP requests for chat functionality.
 * Acts as the middle layer between routes and services.
 * 
 * RESPONSIBILITIES:
 * - Receive and validate incoming requests
 * - Extract data from req.body, req.params, req.query
 * - Call appropriate service functions
 * - Format and send responses
 * - Handle errors using asyncHandler
 * 
 * PATTERN USED:
 * - asyncHandler: Automatically catches errors and passes to error middleware
 * - ApiError: Throws structured errors with status codes
 * - logger: Logs important actions for debugging
 * 
 * USED BY:
 * - chatRoutes.js (routes call these controller functions)
 */

const { asyncHandler } = require("../utils/asyncHandler");
const ApiError = require("../utils/error");
const logger = require("../utils/logger");
const {
  createOrGetConversationService,
  getConversationsService,
  getConversationByIdService,
  updateConversationStatusService,
  deleteConversationService,
  sendMessageService,
  getMessagesService,
  markMessageAsReadService,
  markConversationAsReadService,
  deleteMessageService,
  uploadChatMediaService,
  getAllConversationsForSupportService,
  reassignConversationService,
  getConversationStatsService,
} = require("../services/chatService");

// ========================================
// CONVERSATION CONTROLLERS
// ========================================

/**
 * CREATE OR GET CONVERSATION
 * 
 * What happens:
 * 1. User (farmer) clicks "Contact Support" in app
 * 2. Extracts user ID from authentication token (req.user.id)
 * 3. Checks if conversation already exists between this user and support
 * 4. If exists: Returns existing conversation
 * 5. If not: Creates new conversation with assigned support agent
 * 
 * Called by: POST /api/v1/chat/conversations
 * Called from: Flutter app (User role)
 */
const createOrGetConversation = asyncHandler(async (req, res) => {
  // Step 1: Get authenticated user's ID from JWT token
  // req.user is set by authMiddleware after validating token
  const userId = req.user.id;

  // Step 2: Log action for debugging and monitoring
  logger.info(`User ${userId} attempting to create/get conversation`);

  // Step 3: Call service to handle business logic
  // Service will check for existing conversation or create new one
  const conversation = await createOrGetConversationService(userId);

  // Step 4: Send success response to client
  res.status(200).json({
    message: "Conversation retrieved successfully",
    data: conversation,
  });
});

/**
 * GET MY CONVERSATIONS
 * 
 * What happens:
 * 1. Fetches all conversations for the logged-in user
 * 2. Different results based on role:
 *    - User: Gets their own conversations with support
 *    - Support: Gets conversations assigned to them
 *    - Admin: Gets ALL conversations (override)
 * 3. Supports pagination and filtering by status
 * 
 * Called by: GET /api/v1/chat/conversations
 * Called from: Flutter app, Next.js dashboard
 */
const getMyConversations = asyncHandler(async (req, res) => {
  // Step 1: Extract user info from authenticated token
  const userId = req.user.id;
  const userRole = req.user.role; // "User", "Support", or "Admin"

  // Step 2: Extract pagination and filter parameters from query string
  // Example: /conversations?page=2&limit=20&status=open
  const { 
    page = 1,           // Default to first page if not provided
    limit = 20,         // Default to 20 items per page
    status = ""         // Optional: filter by status (open, waiting, resolved, closed)
  } = req.query;

  // Step 3: Log the request for monitoring
  logger.info(`User ${userId} (${userRole}) fetching conversations - Page: ${page}`);

  // Step 4: Call service to fetch conversations based on user role
  const result = await getConversationsService(
    userId,
    userRole,
    parseInt(page),      // Convert string to number
    parseInt(limit),     // Convert string to number
    status
  );

  // Step 5: Send paginated response
  res.status(200).json({
    message: "Conversations fetched successfully",
    ...result, // Includes: data (conversations array) and pagination info
  });
});

/**
 * GET CONVERSATION BY ID
 * 
 * What happens:
 * 1. User clicks on a specific conversation to open chat
 * 2. Fetches full conversation details with participant information
 * 3. Verifies user has permission to view this conversation
 * 
 * Called by: GET /api/v1/chat/conversations/:id
 * Called from: Flutter app, Next.js dashboard
 */
const getConversationById = asyncHandler(async (req, res) => {
  // Step 1: Get conversation ID from URL parameter
  // Example: /conversations/507f1f77bcf86cd799439011
  const { id } = req.params;

  // Step 2: Get authenticated user's ID and role
  const userId = req.user.id;
  const userRole = req.user.role;

  // Step 3: Log access attempt
  logger.info(`User ${userId} accessing conversation ${id}`);

  // Step 4: Fetch conversation with permission check
  // Service verifies user is participant or admin
  const conversation = await getConversationByIdService(id, userId, userRole);

  // Step 5: Return conversation details
  res.status(200).json({
    message: "Conversation fetched successfully",
    data: conversation,
  });
});

/**
 * UPDATE CONVERSATION STATUS
 * 
 * What happens:
 * 1. Support/Admin changes conversation status
 * 2. Common status changes:
 *    - "open" → "resolved" (issue fixed)
 *    - "waiting" → "open" (support responded)
 *    - "resolved" → "closed" (archived)
 * 
 * Permissions: Support and Admin only (Users cannot change status)
 * 
 * Called by: PATCH /api/v1/chat/conversations/:id/status
 * Called from: Next.js dashboard (Support/Admin)
 */
const updateConversationStatus = asyncHandler(async (req, res) => {
  // Step 1: Get conversation ID from URL
  const { id } = req.params;

  // Step 2: Get new status from request body
  const { status } = req.body;

  // Step 3: Get user info for permission check
  const userId = req.user.id;
  const userRole = req.user.role;

  // Step 4: Validate required fields
  if (!status) {
    throw new ApiError("Status is required", 400);
  }

  // Step 5: Validate status value
  const validStatuses = ["open", "waiting", "resolved", "closed"];
  if (!validStatuses.includes(status)) {
    throw new ApiError(`Invalid status. Must be one of: ${validStatuses.join(", ")}`, 400);
  }

  // Step 6: Check user has permission (Support or Admin only)
  if (!["Support", "Admin"].includes(userRole)) {
    throw new ApiError("Only Support and Admin can update conversation status", 403);
  }

  // Step 7: Log status change
  logger.info(`User ${userId} (${userRole}) updating conversation ${id} status to ${status}`);

  // Step 8: Update status in database
  const conversation = await updateConversationStatusService(id, status, userId, userRole);

  // Step 9: Send success response
  res.status(200).json({
    message: "Conversation status updated successfully",
    data: conversation,
  });
});

/**
 * DELETE CONVERSATION
 * 
 * What happens:
 * 1. Soft deletes conversation (sets isActive to false)
 * 2. Conversation hidden from lists but data preserved
 * 3. Can be restored by setting isActive back to true
 * 
 * Permissions:
 * - User: Can delete their own conversations only
 * - Admin: Can delete any conversation
 * 
 * Called by: DELETE /api/v1/chat/conversations/:id
 * Called from: Flutter app (User), Next.js dashboard (Admin)
 */
const deleteConversation = asyncHandler(async (req, res) => {
  // Step 1: Extract conversation ID from URL
  const { id } = req.params;

  // Step 2: Get user info for permission check
  const userId = req.user.id;
  const userRole = req.user.role;

  // Step 3: Log deletion attempt
  logger.info(`User ${userId} (${userRole}) attempting to delete conversation ${id}`);

  // Step 4: Delete conversation with permission check
  // Service verifies user owns conversation or is admin
  await deleteConversationService(id, userId, userRole);

  // Step 5: Send success response
  res.status(200).json({
    message: "Conversation deleted successfully",
  });
});

// ========================================
// MESSAGE CONTROLLERS
// ========================================

/**
 * SEND MESSAGE
 * 
 * What happens:
 * 1. User types message and clicks send (or selects media)
 * 2. For media: File must be uploaded first to /media endpoint
 * 3. Message saved to database
 * 4. Other participant notified (if using HTTP, not Socket.IO)
 * 
 * Message types:
 * - text: Plain text message (content field required)
 * - image/audio/video: Media message (mediaId field required)
 * 
 * NOTE: This is HTTP fallback. Real-time uses Socket.IO (see chatSocket.js)
 * 
 * Called by: POST /api/v1/chat/messages
 * Called from: Flutter app, Next.js dashboard
 */
const sendMessage = asyncHandler(async (req, res) => {
  // Step 1: Extract message data from request body
  const { conversationId, messageType, content, mediaId } = req.body;

  // Step 2: Get sender's ID from authenticated token
  const senderId = req.user.id;

  // Step 3: Validate required fields
  if (!conversationId) {
    throw new ApiError("Conversation ID is required", 400);
  }

  if (!messageType) {
    throw new ApiError("Message type is required", 400);
  }

  // Step 4: Validate message type
  const validTypes = ["text", "image", "audio", "video"];
  if (!validTypes.includes(messageType)) {
    throw new ApiError(`Invalid message type. Must be one of: ${validTypes.join(", ")}`, 400);
  }

  // Step 5: Validate content based on message type
  if (messageType === "text" && !content) {
    throw new ApiError("Content is required for text messages", 400);
  }

  if (["image", "audio", "video"].includes(messageType) && !mediaId) {
    throw new ApiError("Media ID is required for media messages", 400);
  }

  // Step 6: Log message send attempt
  logger.info(`User ${senderId} sending ${messageType} message to conversation ${conversationId}`);

  // Step 7: Call service to save message
  const message = await sendMessageService({
    conversationId,
    senderId,
    messageType,
    content,
    mediaId,
  });

  // Step 8: Send success response with created message
  res.status(201).json({
    message: "Message sent successfully",
    data: message,
  });
});

/**
 * GET MESSAGES
 * 
 * What happens:
 * 1. Fetches message history for a conversation
 * 2. Returns messages in chronological order (oldest to newest)
 * 3. Supports pagination for loading older messages
 * 
 * Use cases:
 * - Initial load: Get last 50 messages when opening chat
 * - Scroll up: Load previous 50 messages (pagination)
 * - Refresh: Reload messages if connection lost
 * 
 * Called by: GET /api/v1/chat/messages/:conversationId
 * Called from: Flutter app, Next.js dashboard
 */
const getMessages = asyncHandler(async (req, res) => {
  // Step 1: Get conversation ID from URL parameter
  const { conversationId } = req.params;

  // Step 2: Extract pagination parameters from query string
  // Example: /messages/abc123?page=2&limit=50
  const { 
    page = 1,      // Default to first page
    limit = 50     // Default to 50 messages per page
  } = req.query;

  // Step 3: Get user info for permission check
  const userId = req.user.id;
  const userRole = req.user.role;

  // Step 4: Log message fetch request
  logger.info(`User ${userId} fetching messages for conversation ${conversationId} - Page: ${page}`);

  // Step 5: Fetch messages with permission check
  // Service verifies user is participant of conversation
  const result = await getMessagesService(
    conversationId,
    userId,
    userRole,
    parseInt(page),
    parseInt(limit)
  );

  // Step 6: Send paginated message list
  res.status(200).json({
    message: "Messages fetched successfully",
    ...result, // Includes: data (messages array) and pagination info
  });
});

/**
 * MARK MESSAGE AS READ
 * 
 * What happens:
 * 1. Recipient opens message and views it
 * 2. Updates isRead to true and sets readAt timestamp
 * 3. Decreases unread count for recipient
 * 4. Sender sees "read" status (double checkmark)
 * 
 * Permission: Only message recipient can mark as read (not sender)
 * 
 * NOTE: Real-time apps use Socket.IO for this (automatic)
 * This HTTP endpoint is fallback
 * 
 * Called by: PATCH /api/v1/chat/messages/:messageId/read
 * Called from: Flutter app, Next.js dashboard
 */
const markMessageAsRead = asyncHandler(async (req, res) => {
  // Step 1: Get message ID from URL
  const { messageId } = req.params;

  // Step 2: Get user ID (must be recipient, not sender)
  const userId = req.user.id;

  // Step 3: Log read action
  logger.info(`User ${userId} marking message ${messageId} as read`);

  // Step 4: Update message read status
  // Service verifies user is recipient and updates accordingly
  const message = await markMessageAsReadService(messageId, userId);

  // Step 5: Send success response
  res.status(200).json({
    message: "Message marked as read",
    data: message,
  });
});

/**
 * MARK CONVERSATION AS READ
 * 
 * What happens:
 * 1. User opens conversation and views all messages
 * 2. Marks ALL unread messages in conversation as read
 * 3. Resets unread count to 0 for this user
 * 4. More efficient than marking each message individually
 * 
 * Use case: User opens chat → mark entire conversation as read at once
 * 
 * Called by: PATCH /api/v1/chat/conversations/:conversationId/read
 * Called from: Flutter app, Next.js dashboard
 */
const markConversationAsRead = asyncHandler(async (req, res) => {
  // Step 1: Get conversation ID from URL
  const { conversationId } = req.params;

  // Step 2: Get user ID
  const userId = req.user.id;

  // Step 3: Log bulk read action
  logger.info(`User ${userId} marking all messages in conversation ${conversationId} as read`);

  // Step 4: Mark all messages as read
  // Service updates all unread messages and resets count
  await markConversationAsReadService(conversationId, userId);

  // Step 5: Send success response
  res.status(200).json({
    message: "All messages marked as read",
  });
});

/**
 * DELETE MESSAGE
 * 
 * What happens:
 * 1. User/Admin wants to remove a message
 * 2. Message is permanently deleted from database (hard delete)
 * 3. Cannot be recovered after deletion
 * 
 * Permissions:
 * - Message sender can delete their own messages
 * - Admin can delete any message (moderation)
 * 
 * Called by: DELETE /api/v1/chat/messages/:messageId
 * Called from: Flutter app (long-press delete), Next.js dashboard (Admin)
 */
const deleteMessage = asyncHandler(async (req, res) => {
  // Step 1: Get message ID from URL
  const { messageId } = req.params;

  // Step 2: Get user info for permission check
  const userId = req.user.id;
  const userRole = req.user.role;

  // Step 3: Log deletion attempt
  logger.info(`User ${userId} (${userRole}) attempting to delete message ${messageId}`);

  // Step 4: Delete message with permission check
  // Service verifies user is sender or admin
  await deleteMessageService(messageId, userId, userRole);

  // Step 5: Send success response
  res.status(200).json({
    message: "Message deleted successfully",
  });
});

// ========================================
// MEDIA UPLOAD CONTROLLER
// ========================================

/**
 * UPLOAD CHAT MEDIA
 * 
 * What happens:
 * 1. User selects image/video/audio to send in chat
 * 2. App uploads file(s) to this endpoint BEFORE sending message
 * 3. Files saved to uploads/chat/ folder
 * 4. Media records created in MediaMaster collection
 * 5. Returns mediaId(s) to use in message
 * 
 * Process flow:
 * 1. User picks file → Call this endpoint
 * 2. Get mediaId from response
 * 3. Send message with messageType + mediaId
 * 
 * Permissions: All authenticated users (User, Support, Admin)
 * 
 * Called by: POST /api/v1/chat/media
 * Called from: Flutter app, Next.js dashboard
 */
const uploadChatMedia = asyncHandler(async (req, res) => {
  // Step 1: Get uploaded files from multer middleware
  // req.files is populated by chatMediaUpload.array() in routes
  const files = req.files;

  // Step 2: Get media type from request body
  // Type should match file type (image, video, audio)
  const { type } = req.body;

  // Step 3: Validate files were uploaded
  if (!files || files.length === 0) {
    throw new ApiError("No files uploaded", 400);
  }

  // Step 4: Validate type is provided
  if (!type) {
    throw new ApiError("Media type is required", 400);
  }

  // Step 5: Validate type value
  const validTypes = ["image", "video", "audio"];
  if (!validTypes.includes(type)) {
    throw new ApiError(`Invalid media type. Must be one of: ${validTypes.join(", ")}`, 400);
  }

  // Step 6: Get uploader's user info
  const userId = req.user.id;

  // Step 7: Log upload action
  logger.info(`User ${userId} uploading ${files.length} ${type} file(s) for chat`);

  // Step 8: Save media to MediaMaster collection
  // Service creates MediaMaster documents and returns IDs
  const mediaItems = await uploadChatMediaService(files, type, userId);

  // Step 9: Send success response with media IDs
  // Frontend will use these IDs when sending messages
  res.status(201).json({
    message: "Media uploaded successfully",
    data: mediaItems,
  });
});

// ========================================
// SUPPORT/ADMIN CONTROLLERS
// ========================================

/**
 * GET ALL CONVERSATIONS FOR SUPPORT
 * 
 * What happens:
 * 1. Support/Admin opens dashboard
 * 2. Shows list of ALL conversations in system (not just assigned)
 * 3. Used for overview, monitoring, and reassignment
 * 
 * Permissions: Support and Admin only
 * 
 * Difference from getMyConversations:
 * - getMyConversations: Shows conversations assigned to logged-in support
 * - This endpoint: Shows ALL conversations regardless of assignment
 * 
 * Called by: GET /api/v1/chat/support/conversations
 * Called from: Next.js dashboard (Support/Admin panel)
 */
const getAllConversationsForSupport = asyncHandler(async (req, res) => {
  // Step 1: Get user role for permission check
  const userRole = req.user.role;

  // Step 2: Check user has permission
  if (!["Support", "Admin"].includes(userRole)) {
    throw new ApiError("Access denied. Support or Admin role required", 403);
  }

  // Step 3: Extract query parameters
  const { 
    page = 1, 
    limit = 20, 
    status = "",
    assignedTo = "" // Filter by specific support agent (Admin feature)
  } = req.query;

  // Step 4: Log access
  logger.info(`${userRole} fetching all conversations - Page: ${page}`);

  // Step 5: Fetch all conversations with filters
  const result = await getAllConversationsForSupportService(
    parseInt(page),
    parseInt(limit),
    status,
    assignedTo
  );

  // Step 6: Send response
  res.status(200).json({
    message: "All conversations fetched successfully",
    ...result,
  });
});

/**
 * REASSIGN CONVERSATION
 * 
 * What happens:
 * 1. Admin transfers conversation from one support agent to another
 * 2. Updates assignedSupportId in conversation
 * 3. New support agent sees conversation in their list
 * 4. Old support agent no longer sees it
 * 
 * Use cases:
 * - Load balancing between support agents
 * - Specialist needed for specific issue
 * - Support agent going offline/on leave
 * 
 * Permissions: Admin only
 * 
 * Called by: POST /api/v1/chat/support/reassign
 * Called from: Next.js dashboard (Admin panel)
 */
const reassignConversation = asyncHandler(async (req, res) => {
  // Step 1: Check user is Admin
  const userRole = req.user.role;
  if (userRole !== "Admin") {
    throw new ApiError("Access denied. Admin role required", 403);
  }

  // Step 2: Extract data from request body
  const { conversationId, newSupportId } = req.body;

  // Step 3: Validate required fields
  if (!conversationId || !newSupportId) {
    throw new ApiError("Conversation ID and new support ID are required", 400);
  }

  // Step 4: Log reassignment action
  logger.info(`Admin ${req.user.id} reassigning conversation ${conversationId} to support ${newSupportId}`);

  // Step 5: Reassign conversation
  // Service verifies new support exists and has correct role
  const conversation = await reassignConversationService(conversationId, newSupportId);

  // Step 6: Send success response
  res.status(200).json({
    message: "Conversation reassigned successfully",
    data: conversation,
  });
});

/**
 * GET CONVERSATION STATISTICS
 * 
 * What happens:
 * 1. Calculates various metrics for support dashboard
 * 2. Shows overall system health and performance
 * 3. Per-agent statistics (when multiple support agents)
 * 
 * Statistics included:
 * - Total conversations
 * - Active conversations
 * - Conversations by status (open, waiting, resolved, closed)
 * - Average response time
 * - Per-agent stats (total chats, active chats)
 * 
 * Permissions: Support and Admin
 * 
 * Called by: GET /api/v1/chat/support/stats
 * Called from: Next.js dashboard (for charts and metrics)
 */
const getConversationStats = asyncHandler(async (req, res) => {
  // Step 1: Check user has permission
  const userRole = req.user.role;
  if (!["Support", "Admin"].includes(userRole)) {
    throw new ApiError("Access denied. Support or Admin role required", 403);
  }

  // Step 2: Log stats request
  logger.info(`${userRole} ${req.user.id} fetching conversation statistics`);

  // Step 3: Calculate statistics
  const stats = await getConversationStatsService();

  // Step 4: Send statistics response
  res.status(200).json({
    message: "Statistics fetched successfully",
    data: stats,
  });
});

// ========================================
// EXPORT ALL CONTROLLERS
// ========================================

module.exports = {
  // Conversation controllers
  createOrGetConversation,
  getMyConversations,
  getConversationById,
  updateConversationStatus,
  deleteConversation,
  
  // Message controllers
  sendMessage,
  getMessages,
  markMessageAsRead,
  markConversationAsRead,
  deleteMessage,
  
  // Media controller
  uploadChatMedia,
  
  // Support/Admin controllers
  getAllConversationsForSupport,
  reassignConversation,
  getConversationStats,
};
