const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { errorMiddleware } = require('./middleware/errorMiddleware');
const userRoutes = require('./routes/userRoutes');
const logger = require('./utils/logger');

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests
  })
);

// Logging Middleware
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Body Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/users', userRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error Middleware
app.use(errorMiddleware);

module.exports = app;