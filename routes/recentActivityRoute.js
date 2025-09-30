const express = require('express')
const router = express.Router()
const { authMiddleware } = require("../middleware/authMiddleware");
const {getLatestUserActivity} = require('../controllers/recentActivityController')

//user route
router.get("/user", authMiddleware, getLatestUserActivity);

module.exports = router;