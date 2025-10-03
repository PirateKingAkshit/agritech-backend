const { getTextToSpeechService } = require("../services/textToSpeechService");
const { asyncHandler } = require("../utils/asyncHandler");

const getTextToSpeech = asyncHandler(async (req, res, next) => {
    await getTextToSpeechService(req, res, next)
});

module.exports = { getTextToSpeech };
