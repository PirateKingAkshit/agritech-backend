const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateUser,
  validateLogin,
  validateUserId,
  validatePagination,
  validateOtpGenerate,
  validateOtpVerify,
  validateSimpleRegistration,
  validateSimpleUserUpdate,
  handleValidationErrors,
} = require("../utils/validator");
const {
  generateOtp,
  verifyOtp,
  resendOtp,
  createUser,
  createSimpleUser,
  updateSimpleUser,
  loginUserAdmin,
  getUserById,
  getAllUsers: getAllUsersService,
  updateUser,
  deleteUser,
  enableUser,
  disableUser,
  getLoginHistory,
} = require("../services/userService");

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
    try {
      let {
        phone,
        email,
        password,
        otp,
        first_name,
        last_name,
        location,
        state,
        city,
        address,
        role,
      } = req.body;

      // ✅ Parse location if it's a JSON string
      if (location && typeof location === "string") {
        try {
          location = JSON.parse(location);
        } catch (err) {
          console.error("Invalid location JSON:", location);
        }
      }

      console.log("req.file", req.file);

      const user = await createUser({
        phone,
        email,
        password,
        otp,
        first_name,
        last_name,
        location, // now parsed properly
        state,
        city,
        address,
        role,
        image: req.file ? req.file.path : "",
      });

      res.status(200).json({
        message: "User registered successfully",
        data: { id: user._id, phone, email, role: user.role },
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: { message: "Internal server error" } });
    }
  }),
];

const registerSimpleUser = [
  validateSimpleRegistration,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { phone, location } = req.body;
    const result = await createSimpleUser({ phone, location });
    res.status(200).json(result);
  }),
];

const updateSimpleUserProfile = [
  validateSimpleUserUpdate,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    let updates = { ...req.body };
    if (req.file) {
      updates.image = req.file.path;
    }
    const result = await updateSimpleUser(id, updates);
    res.status(200).json(result);
  }),
];

const loginUser = [
  validateLogin,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await loginUserAdmin(
      { email, password },
      { ipAddress: req.ip }
    );
    res.status(200).json(result);
  }),
];

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await getUserById(req.user.id, req.user);
  res.status(200).json({
    message: "User profile fetched successfully",
    data: user,
  });
});

const getAllUsers = [
  validatePagination,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, q = "" } = req.query;
    const result = await getAllUsersService(
      parseInt(page),
      parseInt(limit),
      req.user,
      q
    );
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
    let updates = { ...req.body };

    // ✅ Parse location if it’s a JSON string
    if (updates.location && typeof updates.location === "string") {
      try {
        updates.location = JSON.parse(updates.location);
      } catch (err) {
        console.error("Invalid location JSON in update:", updates.location);
        return res.status(400).json({ error: { message: "Invalid location format" } });
      }
    }

    // ✅ Handle file upload
    if (req.file) {
      updates.image = req.file.path;
    }

    // ✅ Prevent password updates here
    delete updates.password;

    const user = await updateUser(req.params.id, updates, req.user);

    res.status(200).json({
      message: "User updated successfully",
      data: user,
    });
  }),
];


const deleteUserAccount = [
  validateUserId,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const user = await deleteUser(req.params.id, req.user);
    res.status(200).json({ message: "User deleted successfully", data: user });
  }),
];

const enableUserAccount = [
  validateUserId,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const user = await enableUser(req.params.id, req.user);
    res.status(200).json({ message: "User enabled successfully", data: user });
  }),
];

const disableUserAccount = [
  validateUserId,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const user = await disableUser(req.params.id, req.user);
    res.status(200).json({ message: "User disabled successfully", data: user });
  }),
];

const getUserLoginHistory = asyncHandler(async (req, res) => {
  const history = await getLoginHistory(req.user.id);
  res.status(200).json({
    message: "User login history fetched successfully",
    data: history,
  });
});

module.exports = {
  generateOtpHandler,
  verifyOtpHandler,
  resendOtpHandler,
  registerUser,
  registerSimpleUser,
  updateSimpleUserProfile,
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
