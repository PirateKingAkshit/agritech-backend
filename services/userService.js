const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const LoginHistory = require("../models/LoginHistory");
const logger = require("../utils/logger");
const Error = require("../utils/error");

const generateOtp = async (phone) => {
  const user = await User.findOne({ phone, deleted_at: null }).select(
    "+otp +otpExpires"
  );
  if (!user) {
    throw new Error("User not found", 404);
  }
  if (!user.isActive) {
    throw new Error("Unauthorized: User is inactive", 403);
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // Expires in 10 minutes

  user.otp = otp;
  user.otpExpires = otpExpires;
  await user.save();

  logger.info(`OTP generated for phone: ${phone}`);
  return { message: "OTP generated successfully", otp }; // OTP returned for testing; in production, send via SMS/email
};

const verifyOtp = async ({ phone, otp }, { ipAddress }) => {
  const user = await User.findOne({ phone, deleted_at: null }).select(
    "+otp +otpExpires"
  );
  if (!user) {
    throw new Error("User not found", 404);
  }
  if (!user.isActive) {
    throw new Error("Unauthorized: User is inactive", 403);
  }

  if (!user.otp || !user.otpExpires) {
    throw new Error("No OTP found for this user", 400);
  }

  if (user.otpExpires < new Date()) {
    throw new Error("OTP has expired", 400);
  }

  const isMatch = await bcrypt.compare(otp, user.otp);
  if (!isMatch) {
    throw new Error("Invalid OTP", 400);
  }

  // Clear OTP and otpExpires after successful verification
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  await LoginHistory.create({
    userId: user._id,
    phone: user.phone,
    ipAddress,
  });

  const token = jwt.sign(
    { id: user._id, phone: user.phone, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );
  logger.info(
    `User logged in via OTP: ${phone} from IP ${ipAddress || "unknown"}`
  );

  return {
    token,
    data: {
      id: user._id,
      phone: user.phone,
      email: user.email,
      role: user.role,
    },
  };
};

const resendOtp = async (phone) => {
  const user = await User.findOne({ phone, deleted_at: null }).select(
    "+otp +otpExpires"
  );
  if (!user) {
    throw new Error("User not found", 404);
  }
  if (!user.isActive) {
    throw new Error("Unauthorized: User is inactive", 403);
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // Expires in 10 minutes

  user.otp = otp;
  user.otpExpires = otpExpires;
  await user.save();

  logger.info(`OTP resent for phone: ${phone}`);
  return { message: "OTP resent successfully", otp }; // OTP returned for testing; in production, send via SMS/email
};

const createUser = async ({
  phone,
  email,
  password,
  otp,
  first_name,
  last_name,
  location,
  state,
  city,
  address,
  role,
}) => {
  let existingUser;
  if (role === "Admin") {
    existingUser = await User.findOne({ email, deleted_at: null });
  }
  if (role === "User") {
    existingUser = await User.findOne({ phone, deleted_at: null });
  }
  if (existingUser) {
    throw new Error("User already exists with this phone or email", 400);
  }

  const generatedOtp =
    otp || Math.floor(100000 + Math.random() * 900000).toString(); // Generate OTP if not provided
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // Expires in 10 minutes

  const user = new User({
    phone,
    email,
    password,
    otp: generatedOtp,
    otpExpires,
    first_name,
    last_name,
    location,
    state,
    city,
    address,
    role: role || "User",
    isActive: true,
  });

  await user.save();
  logger.info(`User created: ${phone}`);
  return {
    user: { id: user._id, phone, email, role: user.role },
    otp: generatedOtp,
  }; // Return OTP for testing
};

const loginUserAdmin = async ({ email, password }, { ipAddress }) => {
  const user = await User.findOne({ email, deleted_at: null }).select(
    "+password"
  );
  if (!user) {
    throw new Error("Invalid credentials", 401);
  }
  if (!user.isActive) {
    throw new Error("Unauthorized: User is inactive", 403);
  }
  if (user.role !== "Admin") {
    throw new Error("Unauthorized: Only Admin users can log in", 403);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid credentials", 401);
  }

  await LoginHistory.create({
    userId: user._id,
    phone: user.phone,
    ipAddress,
  });

  const token = jwt.sign(
    { id: user._id, phone: user.phone, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    {
      expiresIn: "12h",
    }
  );
  logger.info(`User logged in: ${email} from IP ${ipAddress || "unknown"}`);

  return {
    token,
    data: { id: user._id, phone: user.phone, email, role: user.role },
    message: "Login successful",
  };
};

const getUserById = async (userId, requestingUser) => {
  const user = await User.findOne({ _id: userId, deleted_at: null }).select(
    "-password -otp -otpExpires"
  );
  if (!user) {
    throw new Error("User not found", 404);
  }

  if (requestingUser.role !== "Admin" && requestingUser.id !== userId) {
    throw new Error("Unauthorized to access this user", 403);
  }

  return {
    message: "User fetched successfully",
    data: user,
  };
};

const getAllUsers = async (page = 1, limit = 10, requestingUser, search) => {
  if (requestingUser.role !== "Admin") {
    throw new Error("Unauthorized to access all users", 403);
  }

  const skip = (page - 1) * limit;
  const count = await User.countDocuments({
    deleted_at: null,
    $or: [
      { first_name: { $regex: search, $options: "i" } },
      { last_name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ],
  });
  const users = await User.find({
    deleted_at: null,
    $or: [
      { first_name: { $regex: search, $options: "i" } },
      { last_name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ],
  })
    .select("-password -otp -otpExpires")
    .skip(skip)
    .limit(limit)
    .sort({ created_at: -1 });

  const totalPages = Math.ceil(count / limit);

  logger.info(`Fetched ${users.length} users for page ${page}, limit ${limit}`);
  return {
    message: "Users fetched successfully",
    data: users,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: count,
      limit,
    },
  };
};

const updateUser = async (userId, updates, requestingUser) => {
  if (requestingUser.role !== "Admin" && requestingUser.id !== userId) {
    throw new Error("Unauthorized to update this user", 403);
  }

  const allowedUpdates = [
    "first_name",
    "last_name",
    "phone",
    "email",
    "location",
    "state",
    "city",
    "address",
    "role",
  ];
  const updateKeys = Object.keys(updates);
  const isValidUpdate = updateKeys.every((key) => allowedUpdates.includes(key));
  if (!isValidUpdate) {
    throw new Error("Invalid update fields", 400);
  }

  const user = await User.findOne({ _id: userId, deleted_at: null }).select(
    "+password +otp +otpExpires"
  );
  if (!user) {
    throw new Error("User not found", 404);
  }

  updateKeys.forEach((key) => {
    user[key] = updates[key];
  });
  await user.save();
  logger.info(`User updated: ${user.phone}`);
  return user;
};

const deleteUser = async (userId, requestingUser) => {
  if (requestingUser.role !== "Admin" && requestingUser.id !== userId) {
    throw new Error("Unauthorized to delete this user", 403);
  }

  const user = await User.findOne({ _id: userId, deleted_at: null });
  if (!user) {
    throw new Error("User not found", 404);
  }

  user.deleted_at = new Date();
  user.isActive = false;
  await user.save();
  logger.info(`User soft-deleted: ${user.phone}`);
  return user;
};

const enableUser = async (userId, requestingUser) => {
  if (requestingUser.role !== "Admin") {
    throw new Error("Unauthorized to enable user", 403);
  }

  const user = await User.findOne({ _id: userId, deleted_at: null });
  if (!user) {
    throw new Error("User not found", 404);
  }

  if (user.isActive) {
    throw new Error("User is already enabled", 400);
  }

  user.isActive = true;
  await user.save();
  logger.info(`User enabled: ${user.phone}`);
  return user;
};

const disableUser = async (userId, requestingUser) => {
  if (requestingUser.role !== "Admin") {
    throw new Error("Unauthorized to disable user", 403);
  }

  const user = await User.findOne({ _id: userId, deleted_at: null });
  if (!user) {
    throw new Error("User not found", 404);
  }

  if (!user.isActive) {
    throw new Error("User is already disabled", 400);
  }

  user.isActive = false;
  await user.save();
  logger.info(`User disabled: ${user.phone}`);
  return user;
};

const getLoginHistory = async (userId) => {
  const history = await LoginHistory.find().sort({ loginAt: -1 }).limit(50);
  return history;
};

module.exports = {
  generateOtp,
  verifyOtp,
  resendOtp,
  createUser,
  loginUserAdmin,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser,
  enableUser,
  disableUser,
  getLoginHistory,
};
