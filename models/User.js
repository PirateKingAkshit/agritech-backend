const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      trim: true,
    },
    last_name: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      // unique: true,
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/.+\@.+\..+/, "Invalid email format"],
    },
    password: {
      type: String,
      select: false,
    },
    image: {
      type: String,
    },
    otp: {
      type: String,
      select: false,
    },
    otpExpires: {
      type: Date,
      select: false,
    },
    location: {
      type: {
        lat: { type: Number, min: -90, max: 90 },
        long: { type: Number, min: -180, max: 180 },
      },
    },
    state: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["Admin", "User", "Support"], // ← Added "Support" role
      default: "User",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deleted_at: {
      type: Date,
    },
    activeSessions: [
      {
        token: { type: String },
        loginTime: { type: Date, default: Date.now },
        userAgent: { type: String },
      },
    ],
    userType: {
      type: String,
      enum: ["Farmer", "Seller", "Local Dealers", "Distributors", "Buyer"]
    },
    soilType: {
      type: String,
      trim: true
    },
    cropType: {
      type: String,
      trim: true
    },
    landSize: {
      type: Number, // in acres
      min: 0
    },
    farmLocation: {
      type: String,
      trim: true
    },

    // ========================================
    // CHAT SYSTEM FIELDS (Added for real-time chat functionality)
    // ========================================
    
    // Tracks if user is currently online/connected to Socket.IO
    // Used to show online/offline status in chat
    // Updated when user connects/disconnects from Socket.IO
    isOnline: {
      type: Boolean,
      default: false,
    },
    
    // Stores last time user was seen (for "last seen" feature)
    // Updated on disconnect or periodically while online
    // Displayed as "Last seen 5 minutes ago" in chat UI
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Hash password and OTP before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  if (this.isModified("otp") && this.otp) {
    this.otp = await bcrypt.hash(this.otp, 10);
  }
  next();
});

userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { deleted_at: null } }
);

// Ensure email is unique only if not deleted
userSchema.index(
  { email: 1 },
  { unique: true,sparse: true, partialFilterExpression: { deleted_at: null } }
);

module.exports = mongoose.model("User", userSchema);
