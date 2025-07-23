const { z } = require('zod');
const AppError = require('./error');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('6000'),
  MONGO_URI: z.string().url().min(1, 'MongoDB URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CORS_ORIGIN: z.string().optional(),
  LOG_LEVEL: z.string().default('debug'),
});

const validateEnv = () => {
  try {
    envSchema.parse(process.env);
  } catch (error) {
    if (error && Array.isArray(error.errors)) {
      const messages = error.errors.map(e => e.message).join(', ');
      throw new AppError('Environment validation failed: ' + messages, 500);
    } else {
      throw new AppError('Unexpected error during environment validation: ' + error.message, 500);
    }
  }
};

module.exports = { validateEnv };
