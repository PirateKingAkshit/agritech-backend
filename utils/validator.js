const { body, validationResult, param, query } = require('express-validator');
const Error = require('./error');

const validateUser = [
  // Phone is always required
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number format'),

  // Role is optional but needs to be valid if provided
  body('role')
    .optional({ checkFalsy: true })
    .isIn(['Admin', 'User'])
    .withMessage('Role must be Admin or User'),

  // Email is required only if role is Admin
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Invalid email')
    .normalizeEmail()
    .custom((value, { req }) => {
      if (req.body.role === 'Admin' && !value) {
        throw new Error('Email is required for Admin role');
      }
      return true;
    }),

  // Password is required only if role is Admin
  body('password')
    .optional({ checkFalsy: true })
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .custom((value, { req }) => {
      if (req.body.role === 'Admin' && !value) {
        throw new Error('Password is required for Admin role');
      }
      return true;
    }),

  // Other optional fields
  body('otp')
    .optional({ checkFalsy: true })
    .isString()
    .matches(/^\d{6}$/)
    .withMessage('OTP must be a 6-digit number'),

  body('first_name')
    .optional({ checkFalsy: true })
    .trim(),

  body('last_name')
    .optional({ checkFalsy: true })
    .trim(),

  body('state')
    .optional({ checkFalsy: true })
    .trim(),

  body('city')
    .optional({ checkFalsy: true })
    .trim(),

  body('address')
    .optional({ checkFalsy: true })
    .trim(),

  body('location.lat')
    .optional({ checkFalsy: true })
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  body('location.long')
    .optional({ checkFalsy: true })
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
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
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
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


module.exports = {
  validateUser,
  validateLogin,
  validateUserId,
  validatePagination,
  validateOtpGenerate,
  validateOtpVerify,
  validateCreateCrop,
  validateUpdateCrop,
  handleValidationErrors,
};