const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const LoginHistory = require("../models/LoginHistory");
const logger = require("../utils/logger");
const ApiError = require("../utils/error");
const fs = require("fs").promises;
const path = require("path");

const MAX_SESSIONS = 3; // 🔹 change this number to limit active devices


const generateOtp = async (phone, location, userType) => {
  const user = await User.findOne({ phone, deleted_at: null }).select(
    "+otp +otpExpires"
  );
  if (user) {
    if (!user.isActive) {
      throw new ApiError("Unauthorized: User is inactive", 403);
    }
    //otp-generate for existingUser
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // Expires in 10 minutes

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    logger.info(`OTP generated for phone: ${phone}`);
    return { message: "OTP generated successfully", otp };
  } else {
    const result = await createSimpleUser({ phone, location, userType });
    logger.info(`OTP generated for phone: ${phone}`);
    return { message: "OTP generated successfully", otp: result.otp };
  }
};

const verifyOtp = async ({ phone, otp }, { req }) => {
  const user = await User.findOne({ phone, deleted_at: null }).select(
    "+otp +otpExpires +activeSessions"
  );
  if (!user) throw new ApiError("User not found", 404);
  if (!user.isActive) throw new ApiError("Unauthorized: User is inactive", 403);

  if (!user.otp || !user.otpExpires) throw new ApiError("No OTP found", 400);
  if (user.otpExpires < new Date()) throw new ApiError("OTP has expired", 400);

  const isMatch = await bcrypt.compare(otp, user.otp);
  if (!isMatch) throw new ApiError("Invalid OTP", 400);

  user.otp = undefined;
  user.otpExpires = undefined;

  const token = jwt.sign(
    { id: user._id, phone: user.phone, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );

  const userAgent = req.headers["user-agent"] || "unknown";

  user.activeSessions = user.activeSessions || [];
  user.activeSessions.push({ token, loginTime: new Date(), userAgent });

  if (user.activeSessions.length > MAX_SESSIONS) {
    user.activeSessions = user.activeSessions.slice(-MAX_SESSIONS);
  }

  await user.save();
  await LoginHistory.create({ userId: user._id, phone: user.phone });

  logger.info(`User logged in via OTP: ${phone} from ${userAgent}`);

  return {
    token,
    data: {
      id: user._id,
      phone: user.phone,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      image: user.image,
      address: user.address,
    },
  };
};

const resendOtp = async (phone) => {
  const user = await User.findOne({ phone, deleted_at: null }).select(
    "+otp +otpExpires"
  );
  if (!user) {
    throw new ApiError("User not found", 404);
  }
  if (!user.isActive) {
    throw new ApiError("Unauthorized: User is inactive", 403);
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
  image,
}) => {
  const existingUser = await User.findOne({
    deleted_at: null, // check only active users
    $or: [{ phone }, { email }],
  });
  // if (role === "Admin") {
  //   existingUser = await User.findOne({ email, deleted_at: null });
  // }
  // if (role === "User") {
  //   existingUser = await User.findOne({ phone, deleted_at: null });
  // }
  if (existingUser) {
    throw new ApiError("User already exists with this phone or email", 400);
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
    image: image || "",
  });

  await user.save();
  logger.info(`User created: ${phone}`);
  return {
    user: { id: user._id, phone, email, role: user.role },
    otp: generatedOtp,
  }; // Return OTP for testing
};

const createSimpleUser = async ({ phone, userType, location }) => {
  // Check if user already exists
  const existingUser = await User.findOne({ phone, deleted_at: null });
  if (existingUser) {
    throw new ApiError("User already exists with this phone number", 400);
  }

  // Generate OTP for verification
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // Expires in 10 minutes

  const user = new User({
    phone,
    otp,
    otpExpires,
    location,
    userType,
    role: "User",
    isActive: true,
  });

  await user.save();
  logger.info(`Simple user registration: ${phone}`);

  return {
    message:
      "User registered successfully. Please verify your phone number with OTP.",
    data: {
      id: user._id,
      phone,
      userType,
      role: user.role,
      requiresOtpVerification: true,
    },
    otp, // Return OTP for testing; in production, send via SMS
  };
};

const updateSimpleUser = async (userId, updates) => {
  // Check if user exists
  const user = await User.findOne({ _id: userId, deleted_at: null });
  if (!user) {
    throw new ApiError("User not found", 404);
  }

  // Define allowed fields for simple user updates
  const allowedUpdates = [
    "first_name",
    "last_name",
    "email",
    "location",
    "state",
    "city",
    "address",
    "image",
    "soilType",
    "cropType",
    "landSize",
    "farmLocation",
  ];

  // Filter out invalid fields
  const validUpdates = {};
  Object.keys(updates).forEach((key) => {
    if (
      allowedUpdates.includes(key) &&
      updates[key] !== undefined &&
      updates[key] !== null
    ) {
      validUpdates[key] = updates[key];
    }
  });

  // Check if email is being updated and if it's already taken by another user
  if (validUpdates.email && validUpdates.email !== user.email) {
    const existingUserWithEmail = await User.findOne({
      email: validUpdates.email,
      _id: { $ne: userId },
      deleted_at: null,
    });
    if (existingUserWithEmail) {
      throw new ApiError("Email is already taken by another user", 400);
    }
  }

  if (updates.image && user.image) {
    try {
      await fs.unlink(path.resolve(__dirname, "../", user.image));
    } catch (error) {
      console.error(`Failed to delete old image: ${user.image}`, error);
    }
  }

  // Apply updates
  Object.keys(validUpdates).forEach((key) => {
    user[key] = validUpdates[key];
  });

  await user.save();
  logger.info(`Simple user updated: ${user.phone}`);

  return {
    message: "User updated successfully",
    data: {
      id: user._id,
      phone: user.phone,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      location: user.location,
      state: user.state,
      city: user.city,
      address: user.address,
      role: user.role,
      image: user.image,
      soilType: user.soilType,
      cropType: user.cropType,
      landSize: user.landSize,
      farmLocation: user.farmLocation,
    },
  };
};

const loginUserAdmin = async ({ email, password }, { req }) => {
  const user = await User.findOne({ email, deleted_at: null })
    .select("+password +activeSessions");
  if (!user) throw new ApiError("Invalid credentials", 401);
  if (!user.isActive) throw new ApiError("Unauthorized: User is inactive", 403);
  if (user.role !== "Admin" && user.role !== "Support" && user.role !== "User") throw new ApiError("Only Admin and Support can log in", 403);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new ApiError("Invalid credentials", 401);

  const token = jwt.sign(
    { id: user._id, phone: user.phone, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );

  const userAgent = req.headers["user-agent"] || "unknown";

  user.activeSessions = user.activeSessions || [];
  user.activeSessions.push({ token, loginTime: new Date(), userAgent });

  if (user.activeSessions.length > MAX_SESSIONS) {
    user.activeSessions = user.activeSessions.slice(-MAX_SESSIONS);
  }

  await user.save();
  await LoginHistory.create({ userId: user._id, phone: user.phone });

  logger.info(`User logged in: ${email} from ${userAgent}`);

  return {
    token,
    data: { id: user._id, phone: user.phone, email: user.email, role: user.role },
    message: "Login successful",
  };
};

const getUserById = async (userId, requestingUser) => {
  const user = await User.findOne({ _id: userId, deleted_at: null }).select(
    "-password -otp -otpExpires"
  );
  if (!user) {
    throw new ApiError("User not found", 404);
  }

  if (requestingUser.role !== "Admin" && requestingUser.id !== userId) {
    throw new ApiError("Unauthorized to access this user", 403);
  }

  return {
    message: "User fetched successfully",
    data: user,
  };
};

const getAllUsers = async (page = 1, limit = 10, requestingUser, search) => {
  if (requestingUser.role !== "Admin") {
    throw new ApiError("Unauthorized to access all users", 403);
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
    .sort({ createdAt: -1 });

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
    throw new ApiError("Unauthorized to update this user", 403);
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
    "image",
    "userType",
    "soilType",
    "cropType",
    "landSize",
    "farmLocation",
    "createdAt",
    "updatedAt",
  ];
  console.log("Updates received:", updates);
  const updateKeys = Object.keys(updates);
  const isValidUpdate = updateKeys.every((key) => allowedUpdates.includes(key));

  if (!isValidUpdate) {
    throw new ApiError("Invalid update fields", 400);
  }

  const allowedUserTypes = ["Farmer", "Seller", "Local Dealers", "Distributors", "Buyer"];
  if (updates.userType && !allowedUserTypes.includes(updates.userType)) {
    throw new ApiError("Invalid userType value", 400);
  }

  const user = await User.findOne({ _id: userId, deleted_at: null }).select(
    "+password +otp +otpExpires"
  );
  if (!user) {
    throw new ApiError("User not found", 404);
  }

  if (updates.image && user.image) {
    try {
      await fs.unlink(path.resolve(__dirname, "../", user.image));
    } catch (error) {
      console.error(`Failed to delete old image: ${user.image}`, error);
    }
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
    throw new ApiError("Unauthorized to delete this user", 403);
  }

  const user = await User.findOne({ _id: userId, deleted_at: null });
  if (!user) {
    throw new ApiError("User not found", 404);
  }

  user.deleted_at = new Date();
  user.isActive = false;
  await user.save();
  logger.info(`User soft-deleted: ${user.phone}`);
  return user;
};

const enableUser = async (userId, requestingUser) => {
  if (requestingUser.role !== "Admin") {
    throw new ApiError("Unauthorized to enable user", 403);
  }

  const user = await User.findOne({ _id: userId, deleted_at: null });
  if (!user) {
    throw new ApiError("User not found", 404);
  }

  if (user.isActive) {
    throw new ApiError("User is already enabled", 400);
  }

  user.isActive = true;
  await user.save();
  logger.info(`User enabled: ${user.phone}`);
  return user;
};

const disableUser = async (userId, requestingUser) => {
  if (requestingUser.role !== "Admin") {
    throw new ApiError("Unauthorized to disable user", 403);
  }

  const user = await User.findOne({ _id: userId, deleted_at: null });
  if (!user) {
    throw new ApiError("User not found", 404);
  }

  if (!user.isActive) {
    throw new ApiError("User is already disabled", 400);
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

// List all active sessions
const getActiveSessionsService = async (userId) => {
  const user = await User.findById(userId).select("activeSessions");
  if (!user) throw new ApiError("User not found", 404);
  return user.activeSessions || [];
};

// Logout from current session (remove token)
const logoutSessionService = async (userId, token) => {
  const user = await User.findById(userId).select("activeSessions");
  if (!user) throw new ApiError("User not found", 404);

  user.activeSessions = (user.activeSessions || []).filter(
    (session) => session.token !== token
  );

  await user.save();
};

// Logout from all sessions (clear all tokens)
const logoutAllSessionsService = async (userId) => {
  const user = await User.findById(userId).select("activeSessions");
  if (!user) throw new ApiError("User not found", 404);

  user.activeSessions = [];
  await user.save();
};

const saveUserFCMTokenService = async (userId, token) => {
  const user = await User.findOne({ _id: userId, deleted_at: null });
  if (!user) {
    throw new ApiError("User not found", 404);
  }

  if (!user.fcmToken.includes(token)) {
    user.fcmToken.push(token);
  }
  user.save();
};


module.exports = {
  generateOtp,
  verifyOtp,
  resendOtp,
  createUser,
  createSimpleUser,
  updateSimpleUser,
  loginUserAdmin,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser,
  enableUser,
  disableUser,
  getLoginHistory,
  getActiveSessionsService,
  logoutSessionService,
  logoutAllSessionsService,
  saveUserFCMTokenService
};
