const { body, validationResult, param, query } = require('express-validator');
const Error = require('./error');

const validateUser = [
  // Phone - Always required
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number format'),

  // Role - optional but validated if present
  body('role')
    .optional({ checkFalsy: true })
    .isIn(['Admin', 'User'])
    .withMessage('Role must be Admin or User'),

  // Email - required if role is Admin
  body('email')
    .trim()
    .custom((value, { req }) => {
      if (req.body.role === 'Admin' && !value) {
        throw new Error('Email is required for Admin role');
      }
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new Error('Invalid email');
      }
      return true;
    }),

  // Password - required if role is Admin
  body('password')
    .trim()
    .custom((value, { req }) => {
      if (req.body.role === 'Admin' && !value) {
        throw new Error('Password is required for Admin role');
      }
      if (value && value.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      return true;
    }),

  // Other fields - optional
  body('first_name').optional({ checkFalsy: true }).trim(),
  body('last_name').optional({ checkFalsy: true }).trim(),
  body('state').optional({ checkFalsy: true }).trim(),
  body('city').optional({ checkFalsy: true }).trim(),
  body('address').optional({ checkFalsy: true }).trim(),

  body('location.lat')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (value && (isNaN(value) || value < -90 || value > 90)) {
        throw new Error('Latitude must be between -90 and 90');
      }
      return true;
    }),

  body('location.long')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (value && (isNaN(value) || value < -180 || value > 180)) {
        throw new Error('Longitude must be between -180 and 180');
      }
      return true;
    }),
];

const validateLogin = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const validateUserId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID'),
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

const validateOtpGenerate = [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number format'),
];

const validateOtpVerify = [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number format'),
  body('otp')
    .notEmpty()
    .withMessage('OTP is required')
    .matches(/^\d{6}$/)
    .withMessage('OTP must be a 6-digit number'),
];

const validateCreateCrop = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('variety').trim().notEmpty().withMessage('Variety is required'),
  body('season').trim().notEmpty().withMessage('Season is required'),
];

const validateUpdateCrop = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('variety').optional().trim().notEmpty().withMessage('Variety cannot be empty'),
  body('season').optional().trim().notEmpty().withMessage('Season cannot be empty'),
];

const validateCreateProduct = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('skuCode').trim().notEmpty().withMessage('SKU Code is required'),
  body('unit').trim().notEmpty().withMessage('Unit is required'),
  body('price').trim().notEmpty().withMessage('Price is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
]

const validateCreateScheme = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('translations')
    .isArray({ min: 1 })
    .withMessage('At least one translation is required'),
  body('translations.*.name').trim().notEmpty().withMessage('Translation name is required'),
  body('translations.*.language').trim().notEmpty().withMessage('Translation language is required'),
  body('translations.*.description').optional().trim(),
];

const validateUpdateScheme = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('translations')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one translation is required'),
  body('translations.*.name').optional().trim().notEmpty().withMessage('Translation name cannot be empty'),
  body('translations.*.language').optional().trim().notEmpty().withMessage('Translation language cannot be empty'),
  body('translations.*.description').optional().trim(),
  body('translations.*._id')
    .optional()
    .if(body('translations.*._id').exists())
    .isMongoId()
    .withMessage('Invalid translation ID'),
];

const validateCreateMedia = [
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Type is required')
    .isIn(['video', 'audio', 'image', 'documents'])
    .withMessage('Type must be one of: video, audio, image, documents'),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
    }));

    return next(new Error('Validation failed', 400, formattedErrors));
  }
  next();
};

const validateCreateTutorial = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('language').trim().notEmpty().withMessage('Language is required'),
  body('description')
    .notEmpty().withMessage('Description is required')
    .custom((value) => {
      if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(value)) {
        throw new Error('Description contains illegal <script> tags');
      }
      return true;
    }),
];

const validateUpdateTutorial = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('language').optional().trim().notEmpty().withMessage('Language cannot be empty'),
  body('description')
    .optional().notEmpty().withMessage('Description cannot be empty')
    .custom((value) => {
      if (value && /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(value)) {
        throw new Error('Description contains illegal <script> tags');
      }
      return true;
    }),
];


module.exports = {
  validateUser,
  validateLogin,
  validateUserId,
  validatePagination,
  validateOtpGenerate,
  validateOtpVerify,
  validateCreateCrop,
  validateUpdateCrop,
  validateCreateProduct,
  validateCreateScheme,
  validateUpdateScheme,
  validateCreateMedia,
  validateCreateTutorial,
  validateUpdateTutorial,
  handleValidationErrors,
};