const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const Error = require('../utils/error');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    logger.warn(`Unauthorized access attempt: No token`);
    return next(new Error('No token provided', 401));
  }

  try {
    const decoded = jwt.verify(token, "s8F2vR1tLq6XeA9zYcMhGpWjT4KnUoCd");
    req.user = decoded;
    logger.info(`Authenticated user: ${decoded.phone}`);
    next();
  } catch (error) {
    logger.warn(`Authentication failed: ${error.message}`);
    next(new Error('Invalid or expired token', 401));
  }
};

module.exports = { authMiddleware };