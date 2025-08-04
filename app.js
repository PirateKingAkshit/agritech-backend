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
const mediaMasterRoutes = require('./routes/mediaMasterRoutes')
const tutorialsMasterRoutes = require('./routes/tutorialsMasterRoutes')
const logger = require('./utils/logger');
const mime = require('mime');
const fs = require('fs');

const app = express();

// Security Middleware
// app.use(helmet()); 
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
app.use('/api/v1/media-master', mediaMasterRoutes)
app.use('/api/v1/tutorial-master', tutorialsMasterRoutes)

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/uploads/:type/:filename', (req, res) => {
  const { type, filename } = req.params;
  const filePath = path.join(__dirname, 'uploads', type, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const mimeType = mime.getType(filePath) || 'application/octet-stream';

  const range = req.headers.range;

  // ✅ Set CORS and Range headers FIRST
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Accept-Ranges', 'bytes');

  if (range) {
    // Handle 206 Partial Content
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': chunkSize,
      'Content-Type': mimeType,
      'Access-Control-Allow-Origin': '*', // ✅ Important again!
    });

    stream.pipe(res);
  } else {
    // Full file response
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Access-Control-Allow-Origin': '*',
    });

    fs.createReadStream(filePath).pipe(res);
  }
});

// Error Middleware
app.use(errorMiddleware);

module.exports = app;