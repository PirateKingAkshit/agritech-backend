const ChatMessage = require("../models/ChatMessage");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const { asyncHandler } = require("../utils/asyncHandler");
const ApiError = require("../utils/error");
const logger = require("../utils/logger");

// Get all conversations for support/admin
const getConversations = asyncHandler(async (req, res) => {
  const { role } = req.user;
  
  let query = {};
  
  if (role === "Support") {
    query = { assignedTo: req.user.id };
  } else if (role === "Admin") {
    // Admin can see all conversations
    query = {};
  } else {
    // Regular users can only see their own conversations
    query = { userId: req.user.id };
  }

  const conversations = await Conversation.find(query)
    .populate("userId", "first_name last_name phone")
    .populate("assignedTo", "first_name last_name phone")
    .sort({ lastMessage: -1 });

  res.status(200).json({
    success: true,
    data: conversations,
  });
});

// Get messages for a specific conversation
const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { role } = req.user;

  // Check if user has access to this conversation
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError("Conversation not found", 404);
  }

  const hasAccess = 
    req.user.id === conversation.userId.toString() ||
    req.user.id === conversation.assignedTo?.toString() ||
    role === "Admin";

  if (!hasAccess) {
    throw new ApiError("Access denied to this conversation", 403);
  }

  const messages = await ChatMessage.find({ conversationId })
    .populate("senderId", "first_name last_name")
    .sort({ createdAt: 1 });

  res.status(200).json({
    success: true,
    data: messages,
  });
});

// Create a new conversation (for users)
const createConversation = asyncHandler(async (req, res) => {
  const { role } = req.user;

  if (role !== "User") {
    throw new ApiError("Only users can create conversations", 403);
  }

  // Check if user already has an open conversation
  const existingConversation = await Conversation.findOne({
    userId: req.user.id,
    status: "open",
  });

  if (existingConversation) {
    return res.status(200).json({
      success: true,
      data: existingConversation,
      message: "Existing conversation found",
    });
  }

  const conversation = new Conversation({
    userId: req.user.id,
    status: "open",
  });

  await conversation.save();

  const populatedConversation = await Conversation.findById(conversation._id)
    .populate("userId", "first_name last_name phone");

  res.status(201).json({
    success: true,
    data: populatedConversation,
  });
});

// Assign conversation to support staff
const assignConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { assignedTo } = req.body;
  const { role } = req.user;

  if (role !== "Admin" && role !== "Support") {
    throw new ApiError("Only admin and support can assign conversations", 403);
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError("Conversation not found", 404);
  }

  // Check if assigned user is support or admin
  const assignedUser = await User.findById(assignedTo);
  if (!assignedUser || (assignedUser.role !== "Support" && assignedUser.role !== "Admin")) {
    throw new ApiError("Assigned user must be support or admin", 400);
  }

  conversation.assignedTo = assignedTo;
  await conversation.save();

  const updatedConversation = await Conversation.findById(conversationId)
    .populate("userId", "first_name last_name phone")
    .populate("assignedTo", "first_name last_name phone");

  res.status(200).json({
    success: true,
    data: updatedConversation,
  });
});

// Update conversation status
const updateConversationStatus = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { status } = req.body;
  const { role } = req.user;

  if (role !== "Admin" && role !== "Support") {
    throw new ApiError("Only admin and support can update conversation status", 403);
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError("Conversation not found", 404);
  }

  conversation.status = status;
  await conversation.save();

  res.status(200).json({
    success: true,
    data: conversation,
  });
});

// Get unread message count for user
const getUnreadCount = asyncHandler(async (req, res) => {
  const { role } = req.user;

  let query = {};
  
  if (role === "Support") {
    query = { assignedTo: req.user.id };
  } else if (role === "Admin") {
    query = {};
  } else {
    query = { userId: req.user.id };
  }

  const conversations = await Conversation.find(query);
  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  res.status(200).json({
    success: true,
    data: { unreadCount: totalUnread },
  });
});

// Get support staff list (for admin)
const getSupportStaff = asyncHandler(async (req, res) => {
  const { role } = req.user;

  if (role !== "Admin") {
    throw new ApiError("Only admin can access support staff list", 403);
  }

  const supportStaff = await User.find({
    role: { $in: ["Support", "Admin"] },
    isActive: true,
  }).select("first_name last_name phone role");

  res.status(200).json({
    success: true,
    data: supportStaff,
  });
});

// Send message from Flutter user (auto-create conversation if needed)
const sendMessageFromUser = asyncHandler(async (req, res) => {
  const { messageType, content, fileUrl, fileName, fileSize } = req.body;
  const { role } = req.user;

  if (role !== "User") {
    throw new ApiError("Only users can send messages through this endpoint", 403);
  }

  if (!content && !fileUrl) {
    throw new ApiError("Message content or file is required", 400);
  }

  try {
    // Check if user has an existing open conversation
    let conversation = await Conversation.findOne({
      userId: req.user.id,
      status: "open",
    });

    // If no conversation exists, create one
    if (!conversation) {
      conversation = new Conversation({
        userId: req.user.id,
        status: "open",
      });
      await conversation.save();
    }

    // For now, we'll leave assignedTo as null - support staff can assign themselves later
    // In a real scenario, you might want to auto-assign to available support staff

    // Create the message
    const message = new ChatMessage({
      conversationId: conversation._id,
      senderId: req.user.id,
      receiverId: null, // Will be set when support staff responds
      messageType,
      content,
      fileUrl,
      fileName,
      fileSize,
    });

    await message.save();

    // Update conversation
    conversation.lastMessage = new Date();
    conversation.lastMessageContent = content;
    conversation.unreadCount = (conversation.unreadCount || 0) + 1;
    await conversation.save();

    // Emit to all support staff and admin
    const io = req.app.get('io'); // Get socket instance from app
    if (io) {
      io.to('Support').to('Admin').emit('new_message', {
        _id: message._id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        receiverId: message.receiverId,
        messageType: message.messageType,
        content: message.content,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileSize: message.fileSize,
        isRead: message.isRead,
        createdAt: message.createdAt,
      });

      // Send notification to support staff
      io.to('Support').to('Admin').emit('message_notification', {
        conversationId: conversation._id,
        message: content,
        senderId: req.user.id,
      });
    }

    res.status(201).json({
      success: true,
      data: {
        message: {
          _id: message._id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          messageType: message.messageType,
          content: message.content,
          fileUrl: message.fileUrl,
          fileName: message.fileName,
          fileSize: message.fileSize,
          isRead: message.isRead,
          createdAt: message.createdAt,
        },
        conversation: {
          _id: conversation._id,
          status: conversation.status,
        }
      },
    });
  } catch (error) {
    throw new ApiError("Failed to send message", 500);
  }
});

// Get user's conversation and messages
const getUserConversation = asyncHandler(async (req, res) => {
  const { role } = req.user;

  if (role !== "User") {
    throw new ApiError("Only users can access this endpoint", 403);
  }

  try {
    // Get user's conversation
    const conversation = await Conversation.findOne({
      userId: req.user.id,
      status: "open",
    }).populate("userId", "first_name last_name phone");

    if (!conversation) {
      return res.status(200).json({
        success: true,
        data: {
          conversation: null,
          messages: [],
        },
      });
    }

    // Get messages for this conversation
    const messages = await ChatMessage.find({ conversationId: conversation._id })
      .populate("senderId", "first_name last_name")
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: {
        conversation,
        messages,
      },
    });
  } catch (error) {
    throw new ApiError("Failed to get conversation", 500);
  }
});

module.exports = {
  getConversations,
  getMessages,
  createConversation,
  assignConversation,
  updateConversationStatus,
  getUnreadCount,
  getSupportStaff,
  sendMessageFromUser,
  getUserConversation,
};
