const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["open", "closed", "pending"],
      default: "open",
    },
    lastMessage: {
      type: Date,
      default: Date.now,
    },
    lastMessageContent: {
      type: String,
      default: null,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
  },
  { timestamps: true }
);

// Index for efficient querying
conversationSchema.index({ userId: 1 });
conversationSchema.index({ assignedTo: 1 });
conversationSchema.index({ status: 1 });
conversationSchema.index({ lastMessage: -1 });
conversationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
