const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const ApiError = require("../utils/error");

const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    logger.warn(`Unauthorized access attempt: No token`);
    return next(new ApiError("No token provided", 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    logger.info(`Authenticated user: ${decoded.phone}`);
    next();
  } catch (error) {
    logger.warn(`Authentication failed: ${error.message}`);
    next(new ApiError("Invalid or expired token", 401));
  }
};

module.exports = { authMiddleware };
