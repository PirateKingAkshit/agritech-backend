/**
 * ============================================
 * CONVERSATION MODEL
 * ============================================
 * 
 * PURPOSE:
 * Represents a chat conversation between a User (farmer) and Support/Admin.
 * Each conversation is a container for multiple messages.
 * 
 * WHAT THIS STORES:
 * - Who is chatting (User ID + Assigned Support ID)
 * - Conversation status (open, waiting, resolved, closed)
 * - Last message reference (for showing preview in conversation list)
 * - Unread message count for each participant
 * - Timestamps (created, updated)
 * 
 * USED BY:
 * - chatService.js (creates/manages conversations)
 * - chatController.js (fetches conversations for display)
 * - chatSocket.js (updates conversation on new messages)
 * 
 * SCALABILITY:
 * - assignedSupportId can be ANY support agent (works for 1 or 1000 support staff)
 * - When scaling to multiple support, just change assignment logic in service
 * - No model changes needed for scaling
 */

const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    // ========================================
    // PARTICIPANT FIELDS
    // ========================================
    
    /**
     * userId: The farmer who initiated the chat
     * - Always a User with role "User"
     * - This is the person seeking support/help
     * - Referenced from User model
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },

    /**
     * assignedSupportId: The support agent handling this conversation
     * - Can be a user with role "Support" or "Admin"
     * - For single support: Always the same support person
     * - For multiple support: Assigned via round-robin/load-balancing logic
     * - Can be reassigned if needed (transfer chat to another support)
     */
    assignedSupportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assigned support ID is required"],
    },

    // ========================================
    // CONVERSATION STATUS
    // ========================================
    
    /**
     * status: Current state of the conversation
     * 
     * Values explained:
     * - "open": Active conversation, support can respond
     * - "waiting": User sent message, waiting for support reply
     * - "resolved": Issue resolved, conversation can be closed
     * - "closed": Conversation ended, archived
     * 
     * Used for:
     * - Filtering conversations in support dashboard
     * - Showing pending/active chats
     * - Analytics and reporting
     */
    status: {
      type: String,
      enum: ["open", "waiting", "resolved", "closed"],
      default: "open",
    },

    // ========================================
    // MESSAGE TRACKING
    // ========================================
    
    /**
     * lastMessage: Reference to the most recent message in this conversation
     * 
     * Why we store this:
     * - Shows message preview in conversation list
     * - Helps sort conversations by most recent activity
     * - Avoids querying all messages just to show preview
     * 
     * Updated by:
     * - Socket.IO when new message is sent
     * - chatService when message is created
     */
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },

    /**
     * unreadCount: Number of unread messages for each participant
     * 
     * Structure: Map with userId as key, count as value
     * Example: { "user123": 3, "support456": 0 }
     * 
     * How it works:
     * - When user sends message → support's unread count increases
     * - When support sends message → user's unread count increases
     * - When participant reads messages → their unread count resets to 0
     * 
     * Used for:
     * - Showing notification badges (e.g., "3 unread messages")
     * - Highlighting conversations with unread messages
     */
    unreadCount: {
      type: Map,
      of: Number,
      default: {}, // Empty map initially, populated when conversation is created
    },

    // ========================================
    // METADATA
    // ========================================
    
    /**
     * isActive: Soft delete flag
     * 
     * - true: Conversation is active and visible
     * - false: Conversation is deleted (soft delete)
     * 
     * Why soft delete:
     * - Keep conversation history for records
     * - Can restore deleted conversations if needed
     * - Compliance and audit purposes
     */
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { 
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// ========================================
// INDEXES FOR PERFORMANCE
// ========================================

/**
 * Index on userId: Fast lookup of all conversations for a specific user
 * Used when: User opens app and fetches their conversation list
 */
conversationSchema.index({ userId: 1 });

/**
 * Index on assignedSupportId: Fast lookup of conversations assigned to a support agent
 * Used when: Support opens dashboard and fetches their assigned conversations
 */
conversationSchema.index({ assignedSupportId: 1 });

/**
 * Compound index on userId + assignedSupportId: Check if conversation already exists
 * Used when: User clicks "Contact Support" - prevents duplicate conversations
 */
conversationSchema.index({ userId: 1, assignedSupportId: 1 });

/**
 * Index on status: Filter conversations by status (open, waiting, resolved, closed)
 * Used when: Support filters to see only "waiting" conversations
 */
conversationSchema.index({ status: 1 });

/**
 * Index on updatedAt: Sort conversations by most recent activity
 * Used when: Displaying conversation list sorted by last message time
 */
conversationSchema.index({ updatedAt: -1 });

// ========================================
// EXPORT MODEL
// ========================================

module.exports = mongoose.model("Conversation", conversationSchema);
