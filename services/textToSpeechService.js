const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const languages = {
  hin: "hi",
  eng: "en", // corrected
  tel: "te",
  tam: "ta",
  ben: "bn",
  kan: "kn",
};

const getTextToSpeechService = async (req, res) => {
  const { text, language, api_key, user_id } = req.body;
  if (!text || !language)
    return res.status(400).json({ error: "Text and language required" });

  const langCode = `${languages[language]}_female_v1`;
  const url = `https://ivrapi.indiantts.in/tts?type=indiantts&text=${encodeURIComponent(
    text
  )}&api_key=${api_key}&user_id=${user_id}&action=play&numeric=hcurrency&lang=${langCode}&ver=2`;

  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });

    // ========================
    // Option 1: Raw audio stream (for Flutter or browser playback)
    // ========================
    res.setHeader("Content-Type", response.headers["content-type"]);
    res.setHeader("Content-Disposition", "inline; filename=speech.wav");
    res.send(response.data);

    // ========================
    // Option 2: Base64 (for Postman testing)
    // Uncomment the following lines and comment out the raw audio above to test in Postman
    // ========================
    
    // const audioBase64 = Buffer.from(response.data).toString("base64");
    // res.json({
    //   audio: `data:${response.headers["content-type"]};base64,${audioBase64}`
    // });
    

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch TTS audio" });
  }
};

module.exports = { getTextToSpeechService };
