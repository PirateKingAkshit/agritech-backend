/**
 * ============================================
 * SOCKET.IO CHAT CONFIGURATION
 * ============================================
 * 
 * PURPOSE:
 * Handles all real-time communication for the chat system.
 * This is the PRIMARY method for sending/receiving messages.
 * HTTP endpoints are fallback only.
 * 
 * WHAT THIS DOES:
 * - Authenticates Socket.IO connections using JWT
 * - Manages user online/offline status
 * - Sends/receives messages in real-time
 * - Handles typing indicators
 * - Manages read receipts
 * - Broadcasts events to specific users/rooms
 * 
 * HOW IT WORKS:
 * 1. User connects to Socket.IO with JWT token
 * 2. Server validates token and stores connection
 * 3. User joins conversation rooms
 * 4. User sends/receives events in real-time
 * 5. Server broadcasts events to relevant participants
 * 
 * EVENTS EXPLAINED:
 * - Client → Server: Events user SENDS (emit)
 * - Server → Client: Events user RECEIVES (listen/on)
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const MediaMaster = require("../models/mediaMaster");
const logger = require("../utils/logger");
const {sendPushNotification} = require("../utils/sendPushNotification");

// ========================================
// CONNECTED USERS TRACKER
// ========================================

/**
 * Stores all currently connected users
 * 
 * Structure: Map { userId: socketId }
 * Example: { "user123": "socket_abc", "support456": "socket_xyz" }
 * 
 * Used for:
 * - Finding which socket to send messages to
 * - Checking if user is online
 * - Broadcasting to specific users
 */
const connectedUsers = new Map();

// ========================================
// INITIALIZE SOCKET.IO
// ========================================

/**
 * Main initialization function
 * Called from index.js when server starts
 * 
 * @param {Object} io - Socket.IO server instance
 */
const initializeSocket = (io) => {
  
  // ========================================
  // AUTHENTICATION MIDDLEWARE
  // ========================================
  
  /**
   * Runs BEFORE connection is established
   * 
   * What happens:
   * 1. Extract JWT token from connection handshake
   * 2. Verify token is valid
   * 3. If valid: Allow connection and attach user info
   * 4. If invalid: Reject connection
   * 
   * Token can be sent in two ways:
   * - socket.handshake.auth.token (recommended)
   * - socket.handshake.headers.authorization (fallback)
   */
  io.use(async (socket, next) => {
    try {
      // Step 1: Extract token from handshake
      // Flutter/Next.js will send token when connecting
      const token =
        socket.handshake.auth.token || // Preferred method
        socket.handshake.headers.authorization?.replace("Bearer ", ""); // Alternative

      // Step 2: Check token exists
      if (!token) {
        logger.warn("Socket connection attempted without token");
        return next(new Error("Authentication error: Token required"));
      }

      // Step 3: Verify token using JWT secret
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Step 4: Attach user info to socket for later use
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      socket.userPhone = decoded.phone;

      // Step 5: Update user's online status in database
      await User.findByIdAndUpdate(decoded.id, {
        isOnline: true,
        lastSeen: new Date(),
      });

      logger.info(`Socket authentication successful: User ${decoded.id} (${decoded.role})`);

      // Step 6: Allow connection
      next();
    } catch (error) {
      // Token invalid or expired
      logger.error(`Socket authentication failed: ${error.message}`);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  // ========================================
  // CONNECTION EVENT
  // ========================================
  
  /**
   * Fired when user successfully connects
   * 
   * What happens:
   * 1. User stored in connectedUsers map
   * 2. User joins their personal room (for direct notifications)
   * 3. Online status broadcasted to others
   * 4. All event listeners registered
   */
  io.on("connection", (socket) => {
    // Step 1: Log connection
    logger.info(`✅ User connected: ${socket.userId} (${socket.userRole}) - Socket ID: ${socket.id}`);

    // Step 2: Store user in connected users map
    connectedUsers.set(socket.userId, socket.id);

    // Step 3: User joins their personal room (room name = userId)
    // Used for sending notifications directly to this user
    socket.join(socket.userId);

    // Step 4: Broadcast to ALL users that this user is now online
    io.emit("user:online", {
      userId: socket.userId,
      timestamp: new Date(),
    });

    // ========================================
    // EVENT: CONVERSATION JOIN
    // ========================================
    
    /**
     * CLIENT → SERVER
     * 
     * When: User opens a specific conversation
     * 
     * What it does:
     * - Adds user to conversation room
     * - All participants in room receive messages in real-time
     * 
     * Data sent by client:
     * { conversationId: "abc123" }
     * 
     * Flutter example:
     * socket.emit('conversation:join', { conversationId: conversationId });
     */
    socket.on("conversation:join", async (data) => {
      try {
        const { conversationId } = data;

        // Validate data
        if (!conversationId) {
          socket.emit("error", { message: "Conversation ID is required" });
          return;
        }

        // Verify user is participant of this conversation
        const conversation = await Conversation.findOne({
          _id: conversationId,
          $or: [
            { userId: socket.userId },
            { assignedSupportId: socket.userId },
          ],
          isActive: true,
        });

        if (!conversation) {
          socket.emit("error", { message: "Conversation not found or access denied" });
          return;
        }

        // Join conversation room
        socket.join(conversationId);

        logger.info(`User ${socket.userId} joined conversation ${conversationId}`);

        // Notify user they successfully joined
        socket.emit("conversation:joined", {
          conversationId: conversationId,
          message: "Successfully joined conversation",
        });
      } catch (error) {
        logger.error(`Error joining conversation: ${error.message}`);
        socket.emit("error", { message: "Failed to join conversation" });
      }
    });

    // ========================================
    // EVENT: CONVERSATION LEAVE
    // ========================================
    
    /**
     * CLIENT → SERVER
     * 
     * When: User closes conversation or navigates away
     * 
     * What it does:
     * - Removes user from conversation room
     * - User stops receiving real-time updates for this conversation
     * 
     * Data sent by client:
     * { conversationId: "abc123" }
     * 
     * Flutter example:
     * socket.emit('conversation:leave', { conversationId: conversationId });
     */
    socket.on("conversation:leave", (data) => {
      const { conversationId } = data;

      if (!conversationId) {
        return;
      }

      // Leave conversation room
      socket.leave(conversationId);

      logger.info(`User ${socket.userId} left conversation ${conversationId}`);

      // Acknowledge
      socket.emit("conversation:left", {
        conversationId: conversationId,
        message: "Left conversation",
      });
    });

    // ========================================
    // EVENT: SEND MESSAGE (REAL-TIME)
    // ========================================
    
    /**
     * CLIENT → SERVER
     * 
     * When: User types message and clicks send
     * 
     * What it does:
     * 1. Saves message to database
     * 2. Updates conversation (last message, unread count)
     * 3. Broadcasts message to OTHER participant in real-time
     * 4. Sends confirmation back to sender
     * 
     * Data sent by client:
     * {
     *   conversationId: "abc123",
     *   messageType: "text" | "image" | "audio" | "video",
     *   content: "Hello" (only for text),
     *   mediaId: "media123" (only for media)
     * }
     * 
     * Flutter example (text):
     * socket.emit('message:send', {
     *   conversationId: conversationId,
     *   messageType: 'text',
     *   content: 'Hello, I need help'
     * });
     * 
     * Flutter example (image):
     * // First upload image to /api/v1/chat/media
     * // Then send message with mediaId
     * socket.emit('message:send', {
     *   conversationId: conversationId,
     *   messageType: 'image',
     *   mediaId: uploadedMediaId
     * });
     */
    socket.on("message:send", async (data) => {
      try {
        const { conversationId, messageType, content, mediaId } = data;

        // Step 1: Validate required fields
        if (!conversationId || !messageType) {
          socket.emit("error", { message: "Conversation ID and message type are required" });
          return;
        }

        // Step 2: Verify conversation exists and user is participant
        const conversation = await Conversation.findOne({
          _id: conversationId,
          $or: [
            { userId: socket.userId },
            { assignedSupportId: socket.userId },
          ],
          isActive: true,
        });

        if (!conversation) {
          socket.emit("error", { message: "Conversation not found or access denied" });
          return;
        }

        // Step 3: Build message data
        const messageData = {
          conversationId: conversationId,
          senderId: socket.userId,
          messageType: messageType,
          deliveredAt: new Date(),
        };

        // Step 4: Add content based on message type
        if (messageType === "text") {
          if (!content || content.trim() === "") {
            socket.emit("error", { message: "Content is required for text messages" });
            return;
          }
          messageData.content = content.trim();
        } else {
          // Media message
          if (!mediaId) {
            socket.emit("error", { message: "Media ID is required for media messages" });
            return;
          }

          // Verify media exists
          const media = await MediaMaster.findById(mediaId);
          if (!media) {
            socket.emit("error", { message: "Media not found" });
            return;
          }

          messageData.mediaId = mediaId;
        }

        // Step 5: Save message to database
        const message = await Message.create(messageData);

        // Step 6: Populate sender and media details
        await message.populate("senderId", "first_name last_name phone email image role");
        if (messageType !== "text") {
          await message.populate("mediaId");
        }

        // Step 7: Update conversation
        const receiverId =
          conversation.userId.toString() === socket.userId
            ? conversation.assignedSupportId.toString()
            : conversation.userId.toString();

        conversation.lastMessage = message._id;

        // Increase receiver's unread count
        const currentUnread = conversation.unreadCount.get(receiverId) || 0;
        conversation.unreadCount.set(receiverId, currentUnread + 1);

        // Update status if user sent message
        if (conversation.userId.toString() === socket.userId && conversation.status !== "closed") {
          conversation.status = "waiting";
        }

        conversation.updatedAt = new Date();
        await conversation.save();

        logger.info(`Message sent: ${message._id} by user ${socket.userId} in conversation ${conversationId}`);

        // Step 8: Broadcast message to conversation room (all participants)
        // This sends to everyone in the room INCLUDING sender
        io.to(conversationId).emit("message:new", {
          message: message,
          conversationId: conversationId,
        });

        // Step 9: Send notification to receiver if they're online but not in this conversation room
        // Check if receiver is connected
        if (connectedUsers.has(receiverId)) {
          // Send direct notification to receiver's personal room
          io.to(receiverId).emit("notification:new-message", {
            conversationId: conversationId,
            message: message,
            sender: {
              id: socket.userId,
              name: `${message.senderId.first_name} ${message.senderId.last_name}`,
              role: message.senderId.role,
            },
          });
        }

        // Step 9.1: Send push notification if receiver has FCM tokens
        const receiver = await User.findById(receiverId);

        if (receiver?.fcmToken?.length > 0) {
          await sendPushNotification(receiver.fcmToken, {
            title: `New message from ${message.senderId.first_name}`,
            body:
              message.messageType === "text"
                ? message.content
                : `Sent a ${message.messageType}`,
            data: {
              click_action: "FLUTTER_NOTIFICATION_CLICK",
              type: "chat",
            },
          });
        }


        // Step 10: Send confirmation back to sender
        socket.emit("message:sent", {
          messageId: message._id,
          tempId: data.tempId, // If client sends temporary ID for optimistic UI
          timestamp: message.createdAt,
        });

      } catch (error) {
        logger.error(`Error sending message: ${error.message}`);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ========================================
    // EVENT: TYPING INDICATOR START
    // ========================================
    
    /**
     * CLIENT → SERVER
     * 
     * When: User starts typing in chat input
     * 
     * What it does:
     * - Broadcasts "User is typing..." to other participant
     * 
     * Data sent by client:
     * { conversationId: "abc123" }
     * 
     * Flutter example:
     * // When user types in TextField
     * socket.emit('typing:start', { conversationId: conversationId });
     */
    socket.on("typing:start", async (data) => {
      try {
        const { conversationId } = data;

        if (!conversationId) {
          return;
        }

        // Verify user is participant
        const conversation = await Conversation.findOne({
          _id: conversationId,
          $or: [
            { userId: socket.userId },
            { assignedSupportId: socket.userId },
          ],
        });

        if (!conversation) {
          return;
        }

        // Get user info for display
        const user = await User.findById(socket.userId).select("first_name last_name");

        // Broadcast to OTHER participants in conversation (not sender)
        socket.to(conversationId).emit("typing:user-typing", {
          conversationId: conversationId,
          userId: socket.userId,
          userName: `${user.first_name} ${user.last_name}`,
        });

        logger.info(`User ${socket.userId} started typing in conversation ${conversationId}`);
      } catch (error) {
        logger.error(`Error handling typing indicator: ${error.message}`);
      }
    });

    // ========================================
    // EVENT: TYPING INDICATOR STOP
    // ========================================
    
    /**
     * CLIENT → SERVER
     * 
     * When: User stops typing (no input for 2-3 seconds)
     * 
     * What it does:
     * - Removes "User is typing..." indicator
     * 
     * Data sent by client:
     * { conversationId: "abc123" }
     * 
     * Flutter example:
     * // After 2 seconds of no typing
     * socket.emit('typing:stop', { conversationId: conversationId });
     */
    socket.on("typing:stop", (data) => {
      const { conversationId } = data;

      if (!conversationId) {
        return;
      }

      // Broadcast to OTHER participants
      socket.to(conversationId).emit("typing:user-stopped", {
        conversationId: conversationId,
        userId: socket.userId,
      });
    });

    // ========================================
    // EVENT: MARK MESSAGE AS READ
    // ========================================
    
    /**
     * CLIENT → SERVER
     * 
     * When: User views a message
     * 
     * What it does:
     * 1. Updates message isRead = true
     * 2. Sets readAt timestamp
     * 3. Notifies sender that message was read (read receipt)
     * 
     * Data sent by client:
     * {
     *   messageId: "msg123",
     *   conversationId: "conv456"
     * }
     * 
     * Flutter example:
     * // When message appears on screen
     * socket.emit('message:read', {
     *   messageId: messageId,
     *   conversationId: conversationId
     * });
     */
    socket.on("message:read", async (data) => {
      try {
        const { messageId, conversationId } = data;

        if (!messageId) {
          return;
        }

        // Find and update message
        const message = await Message.findById(messageId);

        if (!message) {
          return;
        }

        // Only recipient can mark as read (not sender)
        if (message.senderId.toString() === socket.userId) {
          return;
        }

        // Update read status
        if (!message.isRead) {
          message.isRead = true;
          message.readAt = new Date();
          await message.save();

          // Update conversation unread count
          const conversation = await Conversation.findById(conversationId);
          if (conversation) {
            const currentUnread = conversation.unreadCount.get(socket.userId) || 0;
            conversation.unreadCount.set(socket.userId, Math.max(0, currentUnread - 1));
            await conversation.save();
          }

          // Notify sender that message was read (read receipt)
          io.to(conversationId).emit("message:read-receipt", {
            messageId: messageId,
            conversationId: conversationId,
            readBy: socket.userId,
            readAt: message.readAt,
          });

          logger.info(`Message ${messageId} marked as read by user ${socket.userId}`);
        }
      } catch (error) {
        logger.error(`Error marking message as read: ${error.message}`);
      }
    });

    // ========================================
    // EVENT: MARK ALL MESSAGES AS READ
    // ========================================
    
    /**
     * CLIENT → SERVER
     * 
     * When: User opens conversation (views all messages)
     * 
     * What it does:
     * - Marks ALL unread messages in conversation as read
     * - Resets unread count to 0
     * - More efficient than marking each message individually
     * 
     * Data sent by client:
     * { conversationId: "abc123" }
     * 
     * Flutter example:
     * // When conversation screen loads
     * socket.emit('conversation:mark-all-read', {
     *   conversationId: conversationId
     * });
     */
    socket.on("conversation:mark-all-read", async (data) => {
      try {
        const { conversationId } = data;

        if (!conversationId) {
          return;
        }

        // Verify user is participant
        const conversation = await Conversation.findOne({
          _id: conversationId,
          $or: [
            { userId: socket.userId },
            { assignedSupportId: socket.userId },
          ],
        });

        if (!conversation) {
          return;
        }

        // Find all unread messages sent TO this user
        const unreadMessages = await Message.find({
          conversationId: conversationId,
          senderId: { $ne: socket.userId },
          isRead: false,
        });

        if (unreadMessages.length > 0) {
          // Mark all as read
          const now = new Date();
          await Message.updateMany(
            {
              conversationId: conversationId,
              senderId: { $ne: socket.userId },
              isRead: false,
            },
            {
              isRead: true,
              readAt: now,
            }
          );

          // Reset unread count
          conversation.unreadCount.set(socket.userId, 0);
          await conversation.save();

          // Notify other participant
          socket.to(conversationId).emit("conversation:all-read", {
            conversationId: conversationId,
            readBy: socket.userId,
            readAt: now,
            count: unreadMessages.length,
          });

          logger.info(`${unreadMessages.length} messages marked as read in conversation ${conversationId}`);
        }
      } catch (error) {
        logger.error(`Error marking conversation as read: ${error.message}`);
      }
    });

    // ========================================
    // EVENT: DISCONNECT
    // ========================================
    
    /**
     * Fired when user disconnects (closes app, loses internet, etc.)
     * 
     * What happens:
     * 1. Remove user from connectedUsers map
     * 2. Update user's offline status in database
     * 3. Broadcast to others that user is offline
     * 4. Clean up any resources
     */
    socket.on("disconnect", async () => {
      try {
        logger.info(`❌ User disconnected: ${socket.userId} - Socket ID: ${socket.id}`);

        // Step 1: Remove from connected users
        connectedUsers.delete(socket.userId);

        // Step 2: Update user's offline status
        await User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        // Step 3: Broadcast offline status to all users
        io.emit("user:offline", {
          userId: socket.userId,
          lastSeen: new Date(),
        });
      } catch (error) {
        logger.error(`Error handling disconnect: ${error.message}`);
      }
    });

    // ========================================
    // EVENT: ERROR HANDLING
    // ========================================
    
    /**
     * Catches any socket errors
     */
    socket.on("error", (error) => {
      logger.error(`Socket error for user ${socket.userId}: ${error.message}`);
    });

  }); // End of io.on("connection")

  // Return io instance for use in other parts of app if needed
  return io;
};

// ========================================
// HELPER FUNCTION: GET CONNECTED USERS
// ========================================

/**
 * Returns list of currently connected user IDs
 * Useful for checking if specific user is online
 */
const getConnectedUsers = () => {
  return Array.from(connectedUsers.keys());
};

/**
 * Check if specific user is currently connected
 */
const isUserOnline = (userId) => {
  return connectedUsers.has(userId);
};

// ========================================
// EXPORT
// ========================================

module.exports = {
  initializeSocket,
  getConnectedUsers,
  isUserOnline,
};
