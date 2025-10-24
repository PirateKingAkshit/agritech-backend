/**
 * ============================================
 * SERVER ENTRY POINT WITH SOCKET.IO
 * ============================================
 * 
 * WHAT CHANGED:
 * - Added Socket.IO integration
 * - Created HTTP server for both Express and Socket.IO
 * - Initialized chat socket handlers
 * 
 * WHAT STAYS SAME:
 * - Database connection
 * - Environment validation
 * - Graceful shutdown
 * - Port configuration
 */

const http = require("http"); // ← ADDED: For creating HTTP server
const socketIO = require("socket.io"); // ← ADDED: Socket.IO library
const app = require("./app");
const connectDB = require("./config/db");
const logger = require("./utils/logger");
const dotenv = require("dotenv");
const { validateEnv } = require("./utils/envValidator");
const mongoose = require("mongoose");
const { initializeSocket } = require("./socket/chatSocket"); // ← ADDED: Chat socket configuration

const startServer = async () => {
  dotenv.config();
  
  try {
    // Step 1: Validate environment variables
    validateEnv();
    
    // Step 2: Connect to MongoDB
    await connectDB();
    
    // Step 3: Get port from environment
    const PORT = process.env.PORT || 5000;
    
    // ========================================
    // SOCKET.IO INTEGRATION (NEW)
    // ========================================
    
    /**
     * Step 4: Create HTTP server
     * 
     * Why: Socket.IO needs HTTP server, not just Express app
     * Express app is passed to HTTP server
     */
    const server = http.createServer(app);
    
    /**
     * Step 5: Initialize Socket.IO with CORS configuration
     * 
     * CORS settings allow connections from:
     * - Flutter mobile app
     * - Next.js web dashboard
     * - Local development
     */
    const io = socketIO(server, {
      cors: {
        origin: [
          "http://localhost:3000",           // Next.js local development
          "http://localhost:5000",           // Same origin
          process.env.FRONTEND_URL || "*",   // Production frontend URL from .env
        ],
        credentials: true,                   // Allow cookies/auth headers
      },
      // Connection settings
      pingTimeout: 60000,    // 60 seconds - how long to wait for pong response
      pingInterval: 25000,   // 25 seconds - how often to send ping
      // If client doesn't respond to ping within timeout, connection is closed
    });
    
    /**
     * Step 6: Initialize chat socket handlers
     * 
     * This registers all Socket.IO event listeners:
     * - message:send
     * - typing:start
     * - conversation:join
     * - etc.
     */
    initializeSocket(io);
    
    /**
     * Step 7: Make Socket.IO accessible in Express routes (optional)
     * 
     * If you need to emit Socket.IO events from HTTP routes,
     * you can access io via req.app.get('io')
     */
    app.set("io", io);
    
    // ========================================
    // START SERVER
    // ========================================
    
    /**
     * Step 8: Start server (HTTP + Socket.IO)
     * 
     * IMPORTANT: Use server.listen(), NOT app.listen()
     * This starts both Express and Socket.IO
     */
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      logger.info(`📡 Socket.IO initialized and ready for connections`);
      logger.info(`💬 Chat system active`);
    });

    // ========================================
    // GRACEFUL SHUTDOWN (EXISTING CODE)
    // ========================================
    
    /**
     * Handle shutdown signals
     * Updated to close Socket.IO connections before shutdown
     */
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);

    function shutdown() {
      logger.info("⚠️  Shutting down gracefully...");
      
      // Step 1: Stop accepting new connections
      server.close(() => {
        logger.info("✅ HTTP server closed");
        
        // Step 2: Close Socket.IO connections
        io.close(() => {
          logger.info("✅ Socket.IO connections closed");
          
          // Step 3: Close database connection
          mongoose.connection.close(false, () => {
            logger.info("✅ MongoDB connection closed");
            process.exit(0);
          });
        });
      });
      
      // Force shutdown after 10 seconds if graceful shutdown fails
      setTimeout(() => {
        logger.error("❌ Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    }
    
  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
