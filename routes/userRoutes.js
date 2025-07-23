const express = require('express');
const router = express.Router();
const { generateOtpHandler, verifyOtpHandler, resendOtpHandler, registerUser, loginUser, getUserProfile, getAllUsers, getUser, updateUserDetails, deleteUserAccount, enableUserAccount, disableUserAccount, getUserLoginHistory } = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/login-history', authMiddleware, getUserLoginHistory);

router.post('/otp/generate', generateOtpHandler);
router.post('/otp/verify', verifyOtpHandler);
router.post('/otp/resend', resendOtpHandler);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', authMiddleware, getUserProfile);
router.get('/', authMiddleware, getAllUsers);
router.get('/:id', authMiddleware, getUser);
router.put('/:id', authMiddleware, updateUserDetails);
router.delete('/:id', authMiddleware, deleteUserAccount);
router.put('/:id/enable', authMiddleware, enableUserAccount);
router.put('/:id/disable', authMiddleware, disableUserAccount);

module.exports = router;