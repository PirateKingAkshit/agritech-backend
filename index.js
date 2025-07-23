const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const dotenv = require('dotenv')
const { validateEnv } = require('./utils/envValidator');
const mongoose = require('mongoose');

const startServer = async () => {
  dotenv.config();
  try {
    validateEnv();
    await connectDB();
    const PORT = process.env.PORT || 6000;
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });

    // Graceful shutdown
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    function shutdown() {
      logger.info('Shutting down gracefully...');
      server.close(() => {
        mongoose.connection.close(false, () => {
          logger.info('MongoDB connection closed.');
          process.exit(0);
        });
      });
    }
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();