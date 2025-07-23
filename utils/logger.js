const winston = require('winston');

const createPrettyFormat = ({ colorize = false } = {}) =>
  winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    colorize ? winston.format.colorize({ all: true }) : winston.format.uncolorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const lines = [];

      // Top separator
      lines.push('═══════════════════════════════════════════════════════════════');

      // Timestamp + level + message
      lines.push(`[${timestamp}] ${level}: ${message}`);

      // Include method and path clearly
      if (meta?.method) lines.push(`Method: ${meta.method}`);
      if (meta?.path) lines.push(`Path: ${meta.path}`);

      // Include additional metadata if any
      const { stack, method, path, ...rest } = meta || {};
      if (Object.keys(rest).length > 0) {
        lines.push('Meta:', JSON.stringify(rest, null, 2));
      }

      // Stack trace formatting
      if (stack) {
        lines.push('Stack Trace:');
        lines.push(stack.split('\n').map(line => '  ' + line).join('\n'));
      }

      // Bottom separator
      lines.push('═══════════════════════════════════════════════════════════════\n');

      return lines.join('\n');
    })
  );

const logger = winston.createLogger({
  level: 'debug',
  transports: [
    new winston.transports.Console({
      format: createPrettyFormat({ colorize: true }),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: createPrettyFormat({ colorize: false }),
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: createPrettyFormat({ colorize: false }),
    }),
  ],
});

module.exports = logger;
