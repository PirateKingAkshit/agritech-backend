const { body, validationResult, param, query } = require('express-validator');
const Error = require('./error');
const ProductCategory = require('../models/productCategoryMaster');
const { trim } = require('zod');

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
    .isIn(['Admin', 'User', 'Support'])
    .withMessage('Role must be Admin or User or Support'),

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

const validateSimpleRegistration = [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number format'),

  body('userType')
    .trim()
    .notEmpty()
    .withMessage('User type is required')
    .bail()
    .isIn(["Farmer", "Seller", "Local Dealers", "Distributors", "Buyer"]),
  
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

const validateSimpleUserUpdate = [
  body('first_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  
  body('last_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format'),
  
  body('state')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('State must be between 1 and 100 characters'),
  
  body('city')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('City must be between 1 and 100 characters'),
  
  body('address')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Address must be between 1 and 500 characters'),
  
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
  body('category').trim().notEmpty().withMessage('Category is required').isMongoId().withMessage('Invalid category ID').custom(async (value) => {
    // Here you can add a check to see if the category exists in the database
    const category = await ProductCategory.findById(value);
    if (!category) {
      throw new Error('Product Category does not exist');
    }
    return true;
  }),
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

// Crop Sale Request Validators
const validateCreateCropSaleRequest = [
  body('cropId')
    .notEmpty().withMessage('cropId is required')
    .isMongoId().withMessage('Invalid cropId'),
  body('quantity')
    .notEmpty().withMessage('quantity is required')
    .isFloat({ gt: 0 }).withMessage('quantity must be a number greater than 0')
    .toFloat(),
  body('quantity_unit')
    .trim()
    .notEmpty()
    .withMessage('quantity_unit is required'),
  body('price_per_unit')
    .optional({ checkFalsy: true })
    .isFloat({ gt: 0 }).withMessage('price_per_unit must be a number greater than 0')
    .toFloat(),
];

const validateUpdateCropSaleRequestUser = [
  body('status').not().exists().withMessage('Status cannot be updated in this route'),
  body('cropId').not().exists().withMessage('cropId cannot be updated'),
  body('quantity').optional({ checkFalsy: true }).isFloat({ gt: 0 }).withMessage('quantity must be a number greater than 0').toFloat(),
  body('quantity_unit').optional({ checkFalsy: true }).trim().notEmpty().withMessage('quantity_unit cannot be empty'),
  body('price_per_unit').optional({ checkFalsy: true }).isFloat({ gt: 0 }).withMessage('price_per_unit must be a number greater than 0').toFloat(),
];

const validateUpdateCropSaleRequestStatus = [
  body('status')
    .notEmpty().withMessage('status is required')
    .isIn(['Pending', 'Approved', 'Rejected', 'Completed'])
    .withMessage('Invalid status value'),
];

// Product Order Validators
const validateCreateProductOrder = [
  body('products')
    .isArray({ min: 1 })
    .withMessage('products must be a non-empty array'),
  body('products.*.productId')
    .notEmpty().withMessage('productId is required')
    .isMongoId().withMessage('Invalid productId'),
  body('products.*.quantity')
    .notEmpty().withMessage('quantity is required')
    .isFloat({ gt: 0 }).withMessage('quantity must be a number greater than 0')
    .toFloat(),
  body('products.*.pricePerUnit')
    .optional({ checkFalsy: true })
    .isFloat({ gt: 0 }).withMessage('pricePerUnit must be > 0')
    .toFloat(),
  body('totalPrice')
    .optional({ checkFalsy: true })
    .isFloat({ gt: 0 }).withMessage('totalPrice must be > 0')
    .toFloat(),
];

const validateUpdateProductOrderUser = [
  body('status').not().exists().withMessage('status cannot be updated by user'),
  body('products')
    .optional({ checkFalsy: true })
    .isArray({ min: 1 })
    .withMessage('products must be a non-empty array'),
  body('products.*.productId')
    .optional({ checkFalsy: true })
    .isMongoId().withMessage('Invalid productId'),
  body('products.*.quantity')
    .optional({ checkFalsy: true })
    .isFloat({ gt: 0 }).withMessage('quantity must be a number greater than 0')
    .toFloat(),
  body('products.*.pricePerUnit')
    .optional({ checkFalsy: true })
    .isFloat({ gt: 0 }).withMessage('pricePerUnit must be > 0')
    .toFloat(),
  body('totalPrice')
    .optional({ checkFalsy: true })
    .isFloat({ gt: 0 }).withMessage('totalPrice must be > 0')
    .toFloat(),
];

const validateUpdateProductOrderStatus = [
  body('status')
    .notEmpty().withMessage('status is required')
    .isIn(['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'])
    .withMessage('Invalid status value'),
];

const validateCartItems = [
  body('productIds')
    .isArray({ min: 1 })
    .withMessage('productIds must be a non-empty array'),
  body('productIds.*')
    .isMongoId()
    .withMessage('All product IDs must be valid ObjectIds'),
];

const validateCreateProductCategory = [
  body('name').trim().notEmpty().withMessage('Name is required'),
];



module.exports = {
  validateUser,
  validateLogin,
  validateUserId,
  validatePagination,
  validateOtpGenerate,
  validateOtpVerify,
  validateSimpleRegistration,
  validateSimpleUserUpdate,
  validateCreateCrop,
  validateUpdateCrop,
  validateCreateProduct,
  validateCreateScheme,
  validateUpdateScheme,
  validateCreateMedia,
  validateCreateTutorial,
  validateUpdateTutorial,
  handleValidationErrors,
  validateCreateCropSaleRequest,
  validateUpdateCropSaleRequestUser,
  validateUpdateCropSaleRequestStatus,
  validateCreateProductOrder,
  validateUpdateProductOrderUser,
  validateUpdateProductOrderStatus,
  validateCartItems,
  validateCreateProductCategory
};