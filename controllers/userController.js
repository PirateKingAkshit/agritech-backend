const { asyncHandler } = require('../utils/asyncHandler');
const { validateUser, validateLogin, validateUserId, validatePagination, validateOtpGenerate, validateOtpVerify, handleValidationErrors } = require('../utils/validator');
const { generateOtp, verifyOtp, resendOtp, createUser, loginUserAdmin, getUserById, getAllUsers:getAllUsersService, updateUser, deleteUser, enableUser, disableUser, getLoginHistory } = require('../services/userService');

const generateOtpHandler = [
  validateOtpGenerate,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { phone } = req.body;
    const result = await generateOtp(phone);
    res.status(200).json(result);
  }),
];

const verifyOtpHandler = [
  validateOtpVerify,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { phone, otp } = req.body;
    const result = await verifyOtp({ phone, otp }, { ipAddress: req.ip });
    res.status(200).json(result);
  }),
];

const resendOtpHandler = [
  validateOtpGenerate,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { phone } = req.body;
    const result = await resendOtp(phone);
    res.status(200).json(result);
  }),
];

const registerUser = [
  validateUser,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { phone, email, password, otp, first_name, last_name, location, state, city, address, role } = req.body;
    const user = await createUser({ phone, email, password, otp, first_name, last_name, location, state, city, address, role });
    res.status(200).json({
      message: 'User registered successfully',
      data: { id: user._id, phone, email, role: user.role },
    });
  }),
];

const loginUser = [
  validateLogin,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await loginUserAdmin({ email, password }, { ipAddress: req.ip });
    res.status(200).json(result);
  }),
];

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await getUserById(req.user.id, req.user);
  res.status(200).json({
    message: 'User profile fetched successfully',
    data: user
  });
});

const getAllUsers = [
  validatePagination,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, q="" } = req.query;
    const result = await getAllUsersService(parseInt(page), parseInt(limit), req.user, q);
    res.status(200).json(result);
  }),
];

const getUser = [
  validateUserId,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const user = await getUserById(req.params.id, req.user);
    res.status(200).json(user);
  }),
];

const updateUserDetails = [
  validateUser,
  validateUserId,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const user = await updateUser(req.params.id, req.body, req.user);
    res.status(200).json({ message: 'User updated successfully', data: user });
  }),
];

const deleteUserAccount = [
  validateUserId,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const user = await deleteUser(req.params.id, req.user);
    res.status(200).json({ message: 'User deleted successfully', data: user });
  }),
];

const enableUserAccount = [
  validateUserId,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const user = await enableUser(req.params.id, req.user);
    res.status(200).json({ message: 'User enabled successfully', data: user });
  }),
];

const disableUserAccount = [
  validateUserId,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const user = await disableUser(req.params.id, req.user);
    res.status(200).json({ message: 'User disabled successfully', data: user });
  }),
];

const getUserLoginHistory = asyncHandler(async (req, res) => {
  const history = await getLoginHistory(req.user.id);
  res.status(200).json({
    message: 'User login history fetched successfully',
    data: history
  });
});

module.exports = {
  generateOtpHandler,
  verifyOtpHandler,
  resendOtpHandler,
  registerUser,
  loginUser,
  getUserProfile,
  getAllUsers,
  getUser,
  updateUserDetails,
  deleteUserAccount,
  enableUserAccount,
  disableUserAccount,
  getUserLoginHistory,
};