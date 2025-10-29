/**
 * ============================================
 * MESSAGE MODEL
 * ============================================
 * 
 * PURPOSE:
 * Stores individual messages sent within a conversation.
 * Supports text messages and media attachments (image, audio, video).
 * 
 * WHAT THIS STORES:
 * - Message content (text or reference to media)
 * - Who sent it (senderId)
 * - Which conversation it belongs to (conversationId)
 * - Message type (text, image, audio, video)
 * - Read status and timestamps
 * 
 * MEDIA HANDLING:
 * - Uses existing MediaMaster model for all media types
 * - Stores mediaId (reference to MediaMaster document)
 * - Media files uploaded separately before sending message
 * 
 * USED BY:
 * - chatService.js (creates/retrieves messages)
 * - chatSocket.js (sends messages in real-time)
 * - chatController.js (fetches message history)
 */

const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // ========================================
    // RELATIONSHIP FIELDS
    // ========================================
    
    /**
     * conversationId: Which conversation this message belongs to
     * 
     * Links message to its parent conversation
     * Used for:
     * - Fetching all messages in a conversation
     * - Grouping messages by conversation
     * - Enforcing that only conversation participants can see messages
     */
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: [true, "Conversation ID is required"],
    },

    /**
     * senderId: Who sent this message
     * 
     * Can be:
     * - User (farmer asking for help)
     * - Support (responding to user)
     * - Admin (responding to user)
     * 
     * Used for:
     * - Displaying sender name and profile
     * - Determining message alignment (left/right) in chat UI
     * - Permission checks (only sender can delete their messages)
     */
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender ID is required"],
    },

    // ========================================
    // MESSAGE CONTENT
    // ========================================
    
    /**
     * messageType: Type of content in this message
     * 
     * Types explained:
     * - "text": Plain text message (stored in 'content' field)
     * - "image": Image attachment (PNG, JPG, WEBP)
     * - "audio": Voice/audio message (MP3, WAV, OGG)
     * - "video": Video attachment (MP4, MOV)
     * 
     * Determines:
     * - Which field to use (content vs mediaId)
     * - How to display message in UI
     * - Validation requirements
     */
    messageType: {
      type: String,
      enum: ["text", "image", "audio", "video"],
      default: "text",
    },

    /**
     * content: Text content of the message
     * 
     * Required when: messageType is "text"
     * Not used when: messageType is image/audio/video
     * 
     * Stores:
     * - User's typed message
     * - Can include emojis, line breaks, etc.
     * - Plain text only (no HTML formatting)
     */
    content: {
      type: String,
      required: function () {
        // Content is required ONLY if message type is "text"
        return this.messageType === "text";
      },
      trim: true,
    },

    /**
     * mediaId: Reference to uploaded media file
     * 
     * Required when: messageType is "image", "audio", or "video"
     * Not used when: messageType is "text"
     * 
     * Links to: MediaMaster collection (your existing media model)
     * 
     * How it works:
     * 1. User uploads file → saved in MediaMaster → returns mediaId
     * 2. User sends message with mediaId
     * 3. Message stores reference to MediaMaster document
     * 4. When fetching messages, populate mediaId to get full media details
     */
    mediaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MediaMaster",
      required: function () {
        // MediaId is required if message type is NOT "text"
        return ["image", "audio", "video"].includes(this.messageType);
      },
    },

    // ========================================
    // READ STATUS TRACKING
    // ========================================
    
    /**
     * isRead: Whether recipient has seen this message
     * 
     * States:
     * - false: Message delivered but not seen (default)
     * - true: Recipient opened chat and viewed message
     * 
     * How it updates:
     * - Automatically set to true when recipient views the message
     * - Socket.IO emits "message:read" event when this changes
     * 
     * Used for:
     * - Showing read receipts (single/double checkmarks)
     * - Calculating unread message count
     * - Notifications (only notify for unread messages)
     */
    isRead: {
      type: Boolean,
      default: false,
    },

    /**
     * readAt: Timestamp when message was read
     * 
     * Set to: Current date/time when isRead changes from false to true
     * Null if: Message hasn't been read yet
     * 
     * Used for:
     * - Showing "Read at 3:45 PM" status
     * - Analytics (average response time)
     * - Message history and audit trail
     */
    readAt: {
      type: Date,
    },

    /**
     * deliveredAt: Timestamp when message was delivered to database
     * 
     * Set to: Current time when message is saved
     * Always has value: Every message has a delivery time
     * 
     * Different from readAt:
     * - deliveredAt: Message reached server (saved to DB)
     * - readAt: Recipient actually viewed the message
     * 
     * Used for:
     * - Showing single checkmark (delivered)
     * - Message ordering and sorting
     */
    deliveredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { 
    timestamps: true, // Adds createdAt (when message was created) and updatedAt
  }
);

// ========================================
// INDEXES FOR PERFORMANCE
// ========================================

/**
 * Compound index on conversationId + createdAt
 * 
 * Purpose: Fetch messages for a conversation sorted by time (newest/oldest first)
 * Used when: Loading chat history for display
 * 
 * Example query it optimizes:
 * Message.find({ conversationId: "abc123" }).sort({ createdAt: -1 })
 */
messageSchema.index({ conversationId: 1, createdAt: -1 });

/**
 * Index on senderId
 * 
 * Purpose: Find all messages sent by a specific user
 * Used when: Generating user activity reports or moderation
 */
messageSchema.index({ senderId: 1 });

/**
 * Index on isRead
 * 
 * Purpose: Quickly find unread messages for notification purposes
 * Used when: Calculating unread counts or showing unread indicators
 */
messageSchema.index({ isRead: 1 });

// ========================================
// EXPORT MODEL
// ========================================

module.exports = mongoose.model("Message", messageSchema);
