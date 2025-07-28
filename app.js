const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { errorMiddleware } = require('./middleware/errorMiddleware');
const userRoutes = require('./routes/userRoutes');
const cropMasterRoutes = require('./routes/cropMasterRoutes');
const productMasterRoutes = require('./routes/productRoutes');
const governmentSchemeRoutes = require('./routes/governmentSchemeRoutes');
const logger = require('./utils/logger');

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100000, // Limit each IP to 100 requests
  })
);

// Logging Middleware
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Body Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/crop-master', cropMasterRoutes);
app.use('/api/v1/product-master', productMasterRoutes);
app.use('/api/v1/government-scheme', governmentSchemeRoutes);

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error Middleware
app.use(errorMiddleware);

module.exports = app;