const mongoose = require("mongoose");
const logger = require("../utils/logger");
const ApiError = require("../utils/error");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("MongoDB connected successfully");
  } catch (error) {
    logger.error("MongoDB connection failed:", error);
    throw new ApiError("Database connection failed", 500);
  }
};

module.exports = connectDB;
