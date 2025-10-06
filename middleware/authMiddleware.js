const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const ApiError = require("../utils/error");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return next(new ApiError("No token provided", 401));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("activeSessions");
    if (!user) return next(new ApiError("User not found", 404));

    const sessionExists = user.activeSessions?.some(s => s.token === token);
    if (!sessionExists) return next(new ApiError("Invalid or expired token", 401));

    req.user = decoded;
    logger.info(`Authenticated user: ${decoded.phone}`);
    next();
  } catch (error) {
    logger.warn(`Authentication failed: ${error.message}`);
    return next(new ApiError("Invalid or expired token", 401));
  }
};

module.exports = { authMiddleware };
