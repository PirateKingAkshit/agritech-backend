const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ChatMessage = require("../models/ChatMessage");
const Conversation = require("../models/Conversation");
const logger = require("../utils/logger");

const setupSocketServer = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST"],
    },
  });

  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("role activeSessions");
      
      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      const sessionExists = user.activeSessions?.some(s => s.token === token);
      if (!sessionExists) {
        return next(new Error("Authentication error: Invalid or expired token"));
      }

      socket.userId = decoded.id;
      socket.userRole = user.role;
      next();
    } catch (error) {
      logger.warn(`Socket authentication failed: ${error.message}`);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    logger.info(`User connected: ${socket.userId} (${socket.userRole})`);

    // Join user to their role-based room
    socket.join(socket.userRole);
    socket.join(socket.userId);

    // Handle joining a conversation
    socket.on("join_conversation", async (conversationId) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          socket.emit("error", { message: "Conversation not found" });
          return;
        }

        // Check if user has access to this conversation
        const hasAccess = 
          socket.userId === conversation.userId.toString() ||
          socket.userId === conversation.assignedTo?.toString() ||
          socket.userRole === "Admin";

        if (!hasAccess) {
          socket.emit("error", { message: "Access denied to this conversation" });
          return;
        }

        socket.join(conversationId);
        socket.emit("joined_conversation", { conversationId });
        logger.info(`User ${socket.userId} joined conversation ${conversationId}`);
      } catch (error) {
        logger.error("Error joining conversation:", error);
        socket.emit("error", { message: "Failed to join conversation" });
      }
    });

    // Handle sending messages
    socket.on("send_message", async (data) => {
      try {
        const { conversationId, messageType, content, fileUrl, fileName, fileSize } = data;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          socket.emit("error", { message: "Conversation not found" });
          return;
        }

        // Check if user has access to this conversation
        const hasAccess = 
          socket.userId === conversation.userId.toString() ||
          socket.userId === conversation.assignedTo?.toString() ||
          socket.userRole === "Admin";

        if (!hasAccess) {
          socket.emit("error", { message: "Access denied to this conversation" });
          return;
        }

        // Determine receiver
        const receiverId = socket.userId === conversation.userId.toString() 
          ? conversation.assignedTo || null 
          : conversation.userId;

        if (!receiverId) {
          socket.emit("error", { message: "No receiver found for this conversation" });
          return;
        }

        // Create message
        const message = new ChatMessage({
          conversationId,
          senderId: socket.userId,
          receiverId,
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
        conversation.unreadCount = socket.userId === conversation.userId.toString() ? 
          conversation.unreadCount : conversation.unreadCount + 1;
        await conversation.save();

        // Emit to conversation room
        io.to(conversationId).emit("new_message", {
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

        // Emit to receiver's personal room for notification
        if (receiverId !== socket.userId) {
          io.to(receiverId).emit("message_notification", {
            conversationId,
            message: content,
            senderId: socket.userId,
          });
        }

        logger.info(`Message sent in conversation ${conversationId} by user ${socket.userId}`);
      } catch (error) {
        logger.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle marking messages as read
    socket.on("mark_as_read", async (conversationId) => {
      try {
        await ChatMessage.updateMany(
          { 
            conversationId, 
            receiverId: socket.userId, 
            isRead: false 
          },
          { isRead: true }
        );

        // Update conversation unread count
        await Conversation.findByIdAndUpdate(conversationId, {
          $inc: { unreadCount: -1 }
        });

        socket.emit("messages_marked_read", { conversationId });
        logger.info(`Messages marked as read in conversation ${conversationId} by user ${socket.userId}`);
      } catch (error) {
        logger.error("Error marking messages as read:", error);
        socket.emit("error", { message: "Failed to mark messages as read" });
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      logger.info(`User disconnected: ${socket.userId}`);
    });
  });

  // Store io instance in app for access in controllers
  server.app = server.app || {};
  server.app.set('io', io);

  return io;
};

module.exports = { setupSocketServer };
