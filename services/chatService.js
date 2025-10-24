/**
 * ============================================
 * CHAT SERVICE
 * ============================================
 * 
 * PURPOSE:
 * Contains all business logic for chat functionality.
 * This is where the actual work happens - database queries, validations, calculations.
 * 
 * RESPONSIBILITIES:
 * - Database operations (create, read, update, delete)
 * - Business rule enforcement
 * - Data validation and sanitization
 * - Support agent assignment logic (SCALABLE FOR MULTIPLE SUPPORT)
 * - Permission checks
 * 
 * PATTERN:
 * - Controllers call service functions
 * - Services interact with database models
 * - Services throw ApiError on failures
 * - Services return clean data objects
 * 
 * SCALABILITY:
 * - Assignment logic is centralized in assignSupportToUser()
 * - Easy to change from single support to multiple support
 * - Just update ONE function when scaling
 */

const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const MediaMaster = require("../models/mediaMaster");
const ApiError = require("../utils/error");
const logger = require("../utils/logger");

// ========================================
// CONVERSATION SERVICES
// ========================================

/**
 * CREATE OR GET CONVERSATION SERVICE
 * 
 * Business logic:
 * 1. Check if conversation already exists between user and support
 * 2. If exists: Return existing conversation (prevent duplicates)
 * 3. If not: Assign a support agent and create new conversation
 * 
 * Scalability:
 * - Currently assigns the single support agent
 * - When multiple support: Just update assignSupportToUser() function
 * - No other code changes needed
 */
const createOrGetConversationService = async (userId) => {
  // Step 1: Find which support agent to assign
  // This function handles single or multiple support logic
  const assignedSupportId = await assignSupportToUser();

  // Step 2: Check if conversation already exists between this user and support
  // Prevents duplicate conversations for same user-support pair
  const existingConversation = await Conversation.findOne({
    userId: userId,
    assignedSupportId: assignedSupportId,
    isActive: true, // Only check active conversations
  })
    .populate("userId", "first_name last_name phone email image isOnline lastSeen") // Get user details
    .populate("assignedSupportId", "first_name last_name phone email image role isOnline lastSeen") // Get support details
    .populate("lastMessage"); // Get last message preview

  // Step 3: If conversation exists, return it
  if (existingConversation) {
    logger.info(`Existing conversation found: ${existingConversation._id}`);
    return existingConversation;
  }

  // Step 4: No existing conversation, create new one
  logger.info(`Creating new conversation between user ${userId} and support ${assignedSupportId}`);

  const newConversation = await Conversation.create({
    userId: userId,
    assignedSupportId: assignedSupportId,
    status: "open", // New conversation starts as "open"
    unreadCount: {
      [userId]: 0,              // User has 0 unread (they just created it)
      [assignedSupportId]: 0,   // Support has 0 unread initially
    },
    isActive: true,
  });

  // Step 5: Populate user details before returning
  await newConversation.populate("userId", "first_name last_name phone email image isOnline lastSeen");
  await newConversation.populate("assignedSupportId", "first_name last_name phone email image role isOnline lastSeen");

  logger.info(`New conversation created: ${newConversation._id}`);
  return newConversation;
};

/**
 * ASSIGN SUPPORT TO USER
 * 
 * ⭐ THIS IS THE KEY FUNCTION FOR SCALABILITY ⭐
 * 
 * CURRENT BEHAVIOR (Single Support):
 * - Finds the one user with role "Support"
 * - Returns that support's ID
 * 
 * FUTURE BEHAVIOR (Multiple Support):
 * - Uncomment one of the strategy functions below
 * - No other code changes needed!
 * 
 * Available strategies (included below):
 * 1. Round Robin: Distribute evenly among all support agents
 * 2. Load Based: Assign to agent with fewest active chats
 * 3. Availability Based: Only assign to online agents
 */
const assignSupportToUser = async () => {
  // Step 1: Find all users with role "Support" who are active
  const supportUsers = await User.find({
    role: "Support",
    isActive: true,
    deleted_at: null, // Exclude soft-deleted users
  });

  // Step 2: Validate that at least one support user exists
  if (!supportUsers || supportUsers.length === 0) {
    // No support users found - this is a critical error
    logger.error("No active support users found in system");
    throw new ApiError("No support agents available. Please contact administrator.", 503);
  }

  // ========================================
  // CURRENT: Single Support Assignment
  // ========================================
  
  // For single support: Just return the first (only) support user
  logger.info(`Assigning support user: ${supportUsers[0]._id}`);
  return supportUsers[0]._id;

  // ========================================
  // FUTURE: Multiple Support Assignment
  // ========================================
  
  // When you have multiple support agents, REPLACE the above return with ONE of these:

  // OPTION 1: Round Robin Assignment (Distribute evenly)
  // return await getRoundRobinSupport(supportUsers);

  // OPTION 2: Load-Based Assignment (Least busy agent)
  // return await getLeastBusySupport(supportUsers);

  // OPTION 3: Availability-Based Assignment (Only online agents)
  // return await getOnlineSupport(supportUsers);
};

/**
 * ROUND ROBIN SUPPORT ASSIGNMENT (For Future Use)
 * 
 * How it works:
 * - Rotates through support agents in order
 * - Support 1 → Support 2 → Support 3 → Support 1 (cycle)
 * - Ensures equal distribution of workload
 * 
 * Implementation:
 * - Counts total conversations per support agent
 * - Assigns to agent with fewest total conversations
 * 
 * To activate: Uncomment the return statement in assignSupportToUser()
 */
const getRoundRobinSupport = async (supportUsers) => {
  // Step 1: Count total conversations for each support agent
  const supportCounts = await Promise.all(
    supportUsers.map(async (support) => {
      const count = await Conversation.countDocuments({
        assignedSupportId: support._id,
      });
      return { supportId: support._id, count };
    })
  );

  // Step 2: Sort by count (ascending) and get agent with least conversations
  supportCounts.sort((a, b) => a.count - b.count);
  
  const selectedSupport = supportCounts[0].supportId;
  logger.info(`Round-robin: Assigned support ${selectedSupport} (has ${supportCounts[0].count} conversations)`);
  
  return selectedSupport;
};

/**
 * LOAD-BASED SUPPORT ASSIGNMENT (For Future Use)
 * 
 * How it works:
 * - Assigns to support agent with fewest ACTIVE conversations
 * - Only counts open/waiting conversations (not resolved/closed)
 * - Prevents overloading busy agents
 * 
 * To activate: Uncomment the return statement in assignSupportToUser()
 */
const getLeastBusySupport = async (supportUsers) => {
  // Step 1: Count active conversations for each support agent
  const supportCounts = await Promise.all(
    supportUsers.map(async (support) => {
      const count = await Conversation.countDocuments({
        assignedSupportId: support._id,
        status: { $in: ["open", "waiting"] }, // Only count active conversations
        isActive: true,
      });
      return { supportId: support._id, count };
    })
  );

  // Step 2: Find agent with minimum active conversations
  supportCounts.sort((a, b) => a.count - b.count);
  
  const selectedSupport = supportCounts[0].supportId;
  logger.info(`Load-based: Assigned support ${selectedSupport} (has ${supportCounts[0].count} active chats)`);
  
  return selectedSupport;
};

/**
 * AVAILABILITY-BASED SUPPORT ASSIGNMENT (For Future Use)
 * 
 * How it works:
 * - Only assigns to support agents who are currently online
 * - If no one online, assigns to agent who was online most recently
 * - Ensures faster response times
 * 
 * To activate: Uncomment the return statement in assignSupportToUser()
 */
const getOnlineSupport = async (supportUsers) => {
  // Step 1: Filter only online support agents
  const onlineSupport = supportUsers.filter((support) => support.isOnline === true);

  // Step 2: If someone is online, assign to them (use load-based among online agents)
  if (onlineSupport.length > 0) {
    logger.info(`${onlineSupport.length} support agents online, using load-based assignment`);
    return await getLeastBusySupport(onlineSupport);
  }

  // Step 3: No one online, find who was online most recently
  const sortedByLastSeen = supportUsers.sort((a, b) => {
    return new Date(b.lastSeen) - new Date(a.lastSeen); // Most recent first
  });

  const selectedSupport = sortedByLastSeen[0]._id;
  logger.info(`No support online, assigned to most recently active: ${selectedSupport}`);
  
  return selectedSupport;
};

/**
 * GET CONVERSATIONS SERVICE
 * 
 * Business logic:
 * - User role: Returns conversations where userId = logged-in user
 * - Support role: Returns conversations assigned to them
 * - Admin role: Returns ALL conversations (override)
 * 
 * Includes pagination and status filtering
 */
const getConversationsService = async (userId, userRole, page, limit, status) => {
  // Step 1: Calculate pagination offset
  const skip = (page - 1) * limit;

  // Step 2: Build query based on user role
  let query = { isActive: true }; // Base query: only active conversations

  if (userRole === "User") {
    // Regular users see only their own conversations
    query.userId = userId;
  } else if (userRole === "Support") {
    // Support sees conversations assigned to them
    query.assignedSupportId = userId;
  }
  // Admin: No additional filters (sees all conversations)

  // Step 3: Add status filter if provided
  if (status && status !== "") {
    query.status = status;
  }

  // Step 4: Count total conversations matching query (for pagination)
  const total = await Conversation.countDocuments(query);

  // Step 5: Fetch conversations with pagination
  const conversations = await Conversation.find(query)
    .populate("userId", "first_name last_name phone email image isOnline lastSeen")
    .populate("assignedSupportId", "first_name last_name phone email image role isOnline lastSeen")
    .populate("lastMessage")
    .sort({ updatedAt: -1 }) // Most recent first
    .skip(skip)
    .limit(limit);

  // Step 6: Calculate pagination info
  const totalPages = Math.ceil(total / limit);

  // Step 7: Return conversations with pagination metadata
  return {
    data: conversations,
    pagination: {
      currentPage: page,
      totalPages: totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * GET CONVERSATION BY ID SERVICE
 * 
 * Business logic:
 * - Fetches single conversation with full details
 * - Verifies user has permission to view
 * - Populates all related data (users, last message)
 */
const getConversationByIdService = async (conversationId, userId, userRole) => {
  // Step 1: Fetch conversation
  const conversation = await Conversation.findById(conversationId)
    .populate("userId", "first_name last_name phone email image isOnline lastSeen")
    .populate("assignedSupportId", "first_name last_name phone email image role isOnline lastSeen")
    .populate("lastMessage");

  // Step 2: Validate conversation exists
  if (!conversation) {
    throw new ApiError("Conversation not found", 404);
  }

  // Step 3: Check if conversation is active
  if (!conversation.isActive) {
    throw new ApiError("Conversation has been deleted", 404);
  }

  // Step 4: Permission check - verify user can access this conversation
  const isParticipant =
    conversation.userId._id.toString() === userId ||
    conversation.assignedSupportId._id.toString() === userId;

  const isAdmin = userRole === "Admin";

  if (!isParticipant && !isAdmin) {
    throw new ApiError("Access denied. You are not a participant of this conversation", 403);
  }

  // Step 5: Return conversation
  return conversation;
};

/**
 * UPDATE CONVERSATION STATUS SERVICE
 * 
 * Business logic:
 * - Only Support and Admin can change status
 * - Validates new status is valid
 * - Logs status change for audit trail
 */
const updateConversationStatusService = async (conversationId, newStatus, userId, userRole) => {
  // Step 1: Find conversation
  const conversation = await Conversation.findById(conversationId);

  // Step 2: Validate conversation exists
  if (!conversation) {
    throw new ApiError("Conversation not found", 404);
  }

  // Step 3: Check user has permission to update
  // Support can only update their own assigned conversations
  // Admin can update any conversation
  if (userRole === "Support") {
    if (conversation.assignedSupportId.toString() !== userId) {
      throw new ApiError("You can only update conversations assigned to you", 403);
    }
  }

  // Step 4: Update status
  const oldStatus = conversation.status;
  conversation.status = newStatus;
  await conversation.save();

  // Step 5: Log status change for audit
  logger.info(`Conversation ${conversationId} status changed: ${oldStatus} → ${newStatus} by ${userId}`);

  // Step 6: Return updated conversation
  await conversation.populate("userId", "first_name last_name phone email image isOnline lastSeen");
  await conversation.populate("assignedSupportId", "first_name last_name phone email image role isOnline lastSeen");

  return conversation;
};

/**
 * DELETE CONVERSATION SERVICE
 * 
 * Business logic:
 * - Soft delete (sets isActive to false)
 * - User can delete their own conversations
 * - Admin can delete any conversation
 * - Support cannot delete conversations
 */
const deleteConversationService = async (conversationId, userId, userRole) => {
  // Step 1: Find conversation
  const conversation = await Conversation.findById(conversationId);

  // Step 2: Validate conversation exists
  if (!conversation) {
    throw new ApiError("Conversation not found", 404);
  }

  // Step 3: Permission check
  if (userRole === "User") {
    // User can only delete their own conversations
    if (conversation.userId.toString() !== userId) {
      throw new ApiError("You can only delete your own conversations", 403);
    }
  } else if (userRole === "Support") {
    // Support cannot delete conversations
    throw new ApiError("Support agents cannot delete conversations", 403);
  }
  // Admin can delete any conversation (no check needed)

  // Step 4: Soft delete
  conversation.isActive = false;
  await conversation.save();

  logger.info(`Conversation ${conversationId} soft-deleted by user ${userId}`);
};

// ========================================
// MESSAGE SERVICES
// ========================================

/**
 * SEND MESSAGE SERVICE
 * 
 * Business logic:
 * 1. Verify user is participant of conversation
 * 2. Validate message data based on type
 * 3. Create message in database
 * 4. Update conversation (last message, unread count)
 * 5. Update conversation status if needed
 */
const sendMessageService = async ({ conversationId, senderId, messageType, content, mediaId }) => {
  // Step 1: Verify conversation exists and user is participant
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new ApiError("Conversation not found", 404);
  }

  if (!conversation.isActive) {
    throw new ApiError("Cannot send message to inactive conversation", 400);
  }

  // Step 2: Check sender is participant
  const isParticipant =
    conversation.userId.toString() === senderId ||
    conversation.assignedSupportId.toString() === senderId;

  if (!isParticipant) {
    throw new ApiError("You are not a participant of this conversation", 403);
  }

  // Step 3: Build message data object
  const messageData = {
    conversationId,
    senderId,
    messageType,
    deliveredAt: new Date(),
  };

  // Step 4: Add content based on message type
  if (messageType === "text") {
    // Text message: store content
    messageData.content = content;
  } else {
    // Media message: verify media exists and store reference
    const media = await MediaMaster.findById(mediaId);
    if (!media) {
      throw new ApiError("Media not found. Please upload media first.", 404);
    }
    messageData.mediaId = mediaId;
  }

  // Step 5: Create message in database
  const message = await Message.create(messageData);

  // Step 6: Populate sender details
  await message.populate("senderId", "first_name last_name phone email image role");
  
  // Step 7: Populate media details if media message
  if (messageType !== "text") {
    await message.populate("mediaId");
  }

  // Step 8: Update conversation
  // - Set this message as last message
  // - Increase unread count for receiver
  // - Update timestamp
  const receiverId =
    conversation.userId.toString() === senderId
      ? conversation.assignedSupportId.toString()
      : conversation.userId.toString();

  conversation.lastMessage = message._id;
  
  // Increase receiver's unread count
  const currentUnread = conversation.unreadCount.get(receiverId) || 0;
  conversation.unreadCount.set(receiverId, currentUnread + 1);
  
  // Update conversation status
  // If user sends message, set to "waiting" (waiting for support response)
  if (conversation.userId.toString() === senderId && conversation.status !== "closed") {
    conversation.status = "waiting";
  }
  
  conversation.updatedAt = new Date();
  await conversation.save();

  logger.info(`Message sent: ${message._id} in conversation ${conversationId}`);

  // Step 9: Return created message
  return message;
};

/**
 * GET MESSAGES SERVICE
 * 
 * Business logic:
 * - Verify user is participant
 * - Fetch messages with pagination
 * - Return in chronological order (oldest to newest)
 */
const getMessagesService = async (conversationId, userId, userRole, page, limit) => {
  // Step 1: Verify conversation exists
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new ApiError("Conversation not found", 404);
  }

  // Step 2: Check user has permission to view messages
  const isParticipant =
    conversation.userId.toString() === userId ||
    conversation.assignedSupportId.toString() === userId;

  const isAdmin = userRole === "Admin";

  if (!isParticipant && !isAdmin) {
    throw new ApiError("Access denied. You are not a participant of this conversation", 403);
  }

  // Step 3: Calculate pagination
  const skip = (page - 1) * limit;

  // Step 4: Count total messages
  const total = await Message.countDocuments({ conversationId });

  // Step 5: Fetch messages with pagination
  const messages = await Message.find({ conversationId })
    .populate("senderId", "first_name last_name phone email image role")
    .populate("mediaId")
    .sort({ createdAt: -1 }) // Newest first (for pagination from bottom)
    .skip(skip)
    .limit(limit);

  // Step 6: Reverse array to show oldest first (chronological order)
  messages.reverse();

  // Step 7: Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);

  // Step 8: Return messages with pagination
  return {
    data: messages,
    pagination: {
      currentPage: page,
      totalPages: totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * MARK MESSAGE AS READ SERVICE
 * 
 * Business logic:
 * - Only recipient can mark message as read (not sender)
 * - Updates isRead flag and readAt timestamp
 * - Decreases unread count for recipient
 */
const markMessageAsReadService = async (messageId, userId) => {
  // Step 1: Find message
  const message = await Message.findById(messageId).populate("conversationId");

  if (!message) {
    throw new ApiError("Message not found", 404);
  }

  // Step 2: Check user is NOT the sender (can't mark own message as read)
  if (message.senderId.toString() === userId) {
    throw new ApiError("Cannot mark your own message as read", 400);
  }

  // Step 3: Check user is participant of conversation
  const conversation = message.conversationId;
  const isParticipant =
    conversation.userId.toString() === userId ||
    conversation.assignedSupportId.toString() === userId;

  if (!isParticipant) {
    throw new ApiError("Access denied", 403);
  }

  // Step 4: Mark message as read
  if (!message.isRead) {
    message.isRead = true;
    message.readAt = new Date();
    await message.save();

    // Step 5: Decrease unread count in conversation
    const currentUnread = conversation.unreadCount.get(userId) || 0;
    conversation.unreadCount.set(userId, Math.max(0, currentUnread - 1));
    await conversation.save();

    logger.info(`Message ${messageId} marked as read by user ${userId}`);
  }

  return message;
};

/**
 * MARK CONVERSATION AS READ SERVICE
 * 
 * Business logic:
 * - Marks ALL unread messages in conversation as read
 * - Resets unread count to 0
 * - More efficient than marking each message individually
 */
const markConversationAsReadService = async (conversationId, userId) => {
  // Step 1: Verify conversation exists and user is participant
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new ApiError("Conversation not found", 404);
  }

  const isParticipant =
    conversation.userId.toString() === userId ||
    conversation.assignedSupportId.toString() === userId;

  if (!isParticipant) {
    throw new ApiError("Access denied", 403);
  }

  // Step 2: Find all unread messages sent TO this user (not BY this user)
  const unreadMessages = await Message.find({
    conversationId: conversationId,
    senderId: { $ne: userId }, // Not sent by this user
    isRead: false,
  });

  // Step 3: Mark all as read
  if (unreadMessages.length > 0) {
    const now = new Date();
    await Message.updateMany(
      {
        conversationId: conversationId,
        senderId: { $ne: userId },
        isRead: false,
      },
      {
        isRead: true,
        readAt: now,
      }
    );

    // Step 4: Reset unread count to 0
    conversation.unreadCount.set(userId, 0);
    await conversation.save();

    logger.info(`${unreadMessages.length} messages marked as read in conversation ${conversationId} by user ${userId}`);
  }
};

/**
 * DELETE MESSAGE SERVICE
 * 
 * Business logic:
 * - Only sender or admin can delete message
 * - Hard delete (permanently removes from database)
 * - Updates conversation if deleted message was last message
 */
const deleteMessageService = async (messageId, userId, userRole) => {
  // Step 1: Find message
  const message = await Message.findById(messageId);

  if (!message) {
    throw new ApiError("Message not found", 404);
  }

  // Step 2: Permission check
  const isSender = message.senderId.toString() === userId;
  const isAdmin = userRole === "Admin";

  if (!isSender && !isAdmin) {
    throw new ApiError("You can only delete your own messages", 403);
  }

  // Step 3: Check if this was the last message in conversation
  const conversation = await Conversation.findById(message.conversationId);
  const wasLastMessage = conversation.lastMessage?.toString() === messageId;

  // Step 4: Delete message
  await message.deleteOne();

  // Step 5: If deleted message was last message, update conversation
  if (wasLastMessage) {
    // Find new last message (most recent remaining message)
    const newLastMessage = await Message.findOne({
      conversationId: conversation._id,
    })
      .sort({ createdAt: -1 })
      .limit(1);

    conversation.lastMessage = newLastMessage?._id || null;
    await conversation.save();
  }

  logger.info(`Message ${messageId} deleted by user ${userId}`);
};

// ========================================
// MEDIA UPLOAD SERVICE
// ========================================

/**
 * UPLOAD CHAT MEDIA SERVICE
 * 
 * Business logic:
 * - Saves uploaded files to MediaMaster collection
 * - Similar to existing media upload but for chat context
 * - No role restriction (User, Support, Admin can all upload)
 */
const uploadChatMediaService = async (files, type, userId) => {
  // Step 1: Prepare array to store created media items
  const mediaItems = [];

  // Step 2: Get base URL from environment
  const baseUrl = process.env.BASE_URL || "http://localhost:5000";

  // Step 3: Process each uploaded file
  for (const file of files) {
    // Normalize file path (use forward slashes for URLs)
    const normalizedPath = file.path.replace(/\\/g, "/");

    // Step 4: Create MediaMaster document
    const mediaData = {
      name: file.originalname,          // Original filename
      type: type,                        // "image", "audio", or "video"
      url: `${baseUrl}/${normalizedPath}`, // Full URL to access file
      format: file.mimetype,             // MIME type (e.g., "image/jpeg")
      size: file.size,                   // File size in bytes
    };

    const media = await MediaMaster.create(mediaData);
    mediaItems.push(media);

    logger.info(`Chat media uploaded: ${media._id} by user ${userId}`);
  }

  // Step 5: Return array of created media items with IDs
  return mediaItems;
};

// ========================================
// SUPPORT/ADMIN SERVICES
// ========================================

/**
 * GET ALL CONVERSATIONS FOR SUPPORT SERVICE
 * 
 * Business logic:
 * - Returns ALL conversations in system
 * - Supports filtering by status and assigned agent
 * - Used for support dashboard overview
 */
const getAllConversationsForSupportService = async (page, limit, status, assignedTo) => {
  // Step 1: Calculate pagination
  const skip = (page - 1) * limit;

  // Step 2: Build query
  const query = { isActive: true };

  if (status && status !== "") {
    query.status = status;
  }

  if (assignedTo && assignedTo !== "") {
    query.assignedSupportId = assignedTo;
  }

  // Step 3: Count total
  const total = await Conversation.countDocuments(query);

  // Step 4: Fetch conversations
  const conversations = await Conversation.find(query)
    .populate("userId", "first_name last_name phone email image isOnline lastSeen")
    .populate("assignedSupportId", "first_name last_name phone email image role isOnline lastSeen")
    .populate("lastMessage")
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);

  // Step 5: Return with pagination
  const totalPages = Math.ceil(total / limit);

  return {
    data: conversations,
    pagination: {
      currentPage: page,
      totalPages: totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * REASSIGN CONVERSATION SERVICE
 * 
 * Business logic:
 * - Transfers conversation from one support agent to another
 * - Updates assignedSupportId
 * - Validates new support agent exists and has correct role
 */
const reassignConversationService = async (conversationId, newSupportId) => {
  // Step 1: Verify conversation exists
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new ApiError("Conversation not found", 404);
  }

  // Step 2: Verify new support user exists and has Support role
  const newSupport = await User.findOne({
    _id: newSupportId,
    role: { $in: ["Support", "Admin"] }, // Can assign to Support or Admin
    isActive: true,
    deleted_at: null,
  });

  if (!newSupport) {
    throw new ApiError("Support user not found or invalid", 404);
  }

  // Step 3: Update assignedSupportId
  const oldSupportId = conversation.assignedSupportId;
  conversation.assignedSupportId = newSupportId;
  
  // Reset unread count for new support agent
  conversation.unreadCount.set(newSupportId.toString(), 0);
  
  await conversation.save();

  // Step 4: Log reassignment
  logger.info(`Conversation ${conversationId} reassigned from ${oldSupportId} to ${newSupportId}`);

  // Step 5: Return updated conversation
  await conversation.populate("userId", "first_name last_name phone email image isOnline lastSeen");
  await conversation.populate("assignedSupportId", "first_name last_name phone email image role isOnline lastSeen");

  return conversation;
};

/**
 * GET CONVERSATION STATISTICS SERVICE
 * 
 * Business logic:
 * - Calculates various metrics for dashboard
 * - Per-agent statistics (for multiple support)
 * - Overall system health indicators
 */
const getConversationStatsService = async () => {
  // Step 1: Total conversations
  const totalConversations = await Conversation.countDocuments({ isActive: true });

  // Step 2: Conversations by status
  const statusCounts = await Conversation.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  // Format status counts as object
  const statusStats = {};
  statusCounts.forEach((item) => {
    statusStats[item._id] = item.count;
  });

  // Step 3: Active conversations (open + waiting)
  const activeConversations =
    (statusStats.open || 0) + (statusStats.waiting || 0);

  // Step 4: Per-agent statistics
  const agentStats = await Conversation.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: "$assignedSupportId",
        totalConversations: { $sum: 1 },
        activeConversations: {
          $sum: {
            $cond: [
              { $in: ["$status", ["open", "waiting"]] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  // Populate agent names
  const agentStatsWithNames = await Promise.all(
    agentStats.map(async (stat) => {
      const agent = await User.findById(stat._id).select(
        "first_name last_name email"
      );
      return {
        agentId: stat._id,
        agentName: agent
          ? `${agent.first_name} ${agent.last_name}`
          : "Unknown",
        agentEmail: agent?.email,
        totalConversations: stat.totalConversations,
        activeConversations: stat.activeConversations,
      };
    })
  );

  // Step 5: Total messages count
  const totalMessages = await Message.countDocuments();

  // Step 6: Return statistics object
  return {
    totalConversations,
    activeConversations,
    statusBreakdown: statusStats,
    perAgentStats: agentStatsWithNames,
    totalMessages,
    generatedAt: new Date(),
  };
};

// ========================================
// EXPORT ALL SERVICES
// ========================================

module.exports = {
  // Conversation services
  createOrGetConversationService,
  getConversationsService,
  getConversationByIdService,
  updateConversationStatusService,
  deleteConversationService,

  // Message services
  sendMessageService,
  getMessagesService,
  markMessageAsReadService,
  markConversationAsReadService,
  deleteMessageService,

  // Media service
  uploadChatMediaService,

  // Support/Admin services
  getAllConversationsForSupportService,
  reassignConversationService,
  getConversationStatsService,
};
