const express = require("express");
const { getTextToSpeech } = require("../controllers/textToSpeechController");
const router = express.Router();


// Route to get mandi price
router.post("/", getTextToSpeech);

module.exports = router;
