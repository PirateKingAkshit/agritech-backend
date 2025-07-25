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
      unique: true,
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
      enum: ["Admin", "User"],
      default: "User",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deleted_at: {
      type: Date,
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

userSchema.index({ phone: 1, deleted_at: 1 }, { unique: true });  //unique index for phone and deleted_at

module.exports = mongoose.model("User", userSchema);
