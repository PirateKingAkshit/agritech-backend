const { Translate } = require('@google-cloud/translate').v2;
const translateFallback = require('google-translate-api-x');
const ApiError = require('./error');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Google Cloud Translate client (only if credentials are available)
let googleTranslateClient = null;
const GOOGLE_CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const GOOGLE_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const GOOGLE_KEY = process.env.GOOGLE_CLOUD_API_KEY;

try {
  // Try to initialize Google Cloud Translate if credentials are available
  if (GOOGLE_CREDENTIALS_PATH || GOOGLE_PROJECT_ID || GOOGLE_KEY) {
    const config = {};
    if (GOOGLE_CREDENTIALS_PATH) {
      config.keyFilename = GOOGLE_CREDENTIALS_PATH;
    }
    if (GOOGLE_PROJECT_ID) {
      config.projectId = GOOGLE_PROJECT_ID;
    }
    if (GOOGLE_KEY) {
      config.key = GOOGLE_KEY;
    }
    googleTranslateClient = new Translate(config);
    console.log('✅ Google Cloud Translate initialized successfully');
  } else {
    console.log('⚠️ Google Cloud Translate credentials not found, will use fallback only');
  }
} catch (error) {
  console.warn('⚠️ Failed to initialize Google Cloud Translate, will use fallback:', error.message);
  googleTranslateClient = null;
}

/**
 * Translate text using official Google Cloud Translate
 * @param {string} text - The text to translate
 * @param {string} targetLanguageCode - The target language code
 * @returns {Promise<string>} - The translated text
 */
const translateWithOfficial = async (text, targetLanguageCode) => {
  if (!googleTranslateClient) {
    throw new Error('Google Cloud Translate client not initialized');
  }

  try {
    const [translation] = await googleTranslateClient.translate(text, targetLanguageCode);
    return translation;
  } catch (error) {
    throw new Error(`Google Cloud Translate error: ${error.message}`);
  }
};

/**
 * Translate text using fallback (free unofficial API)
 * @param {string} text - The text to translate
 * @param {string} targetLanguageCode - The target language code
 * @returns {Promise<string>} - The translated text
 */
const translateWithFallback = async (text, targetLanguageCode) => {
  try {
    const result = await translateFallback(text, { to: targetLanguageCode });
    return result.text || text;
  } catch (error) {
    throw new Error(`Fallback translation error: ${error.message}`);
  }
};

/**
 * Translate text to a target language using Google Translate with fallback
 * @param {string} text - The text to translate
 * @param {string} targetLanguageCode - The target language code (e.g., 'hi', 'te', 'ta', 'bn', 'kn', 'en')
 * @returns {Promise<string>} - The translated text
 */
const translateText = async (text, targetLanguageCode) => {
  try {
    // If text is empty or null, return as is
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return text;
    }

    // If target language is English or 'en', return original text
    if (!targetLanguageCode || 
        targetLanguageCode.toLowerCase() === 'en' || 
        targetLanguageCode.toLowerCase() === 'eng' || 
        targetLanguageCode.toLowerCase() === 'english') {
      return text;
    }

    // Map language codes to Google Translate format
    const languageMap = {
      'hin': 'hi',   // Hindi
      'hi': 'hi',
      'tel': 'te',   // Telugu
      'te': 'te',
      'tam': 'ta',   // Tamil
      'ta': 'ta',
      'ben': 'bn',   // Bengali
      'bn': 'bn',
      'kan': 'kn',   // Kannada
      'kn': 'kn',
      'mar': 'mr',   // Marathi
      'mr': 'mr',
      'guj': 'gu',   // Gujarati
      'gu': 'gu',
      'ori': 'or',   // Odia
      'or': 'or',
      'pan': 'pa',   // Punjabi
      'pa': 'pa',
      'mal': 'ml',   // Malayalam
      'ml': 'ml',
      'urd': 'ur',   // Urdu
      'ur': 'ur',
    };

    // Get the mapped language code, default to the provided code if not found
    const langCode = languageMap[targetLanguageCode.toLowerCase()] || targetLanguageCode.toLowerCase();

    // Try official Google Cloud Translate first (if available)
    if (googleTranslateClient) {
      try {
        const translated = await translateWithOfficial(text, langCode);
        return translated || text;
      } catch (officialError) {
        console.warn('Official Google Cloud Translate failed, using fallback:', officialError.message);
        // Fall through to use fallback
      }
    }

    // Use fallback (free unofficial API)
    const translated = await translateWithFallback(text, langCode);
    return translated || text;

  } catch (error) {
    console.error('Translation error (both methods failed):', error.message);
    // If all translation methods fail, return original text
    return text;
  }
};

/**
 * Translate multiple fields of an object
 * @param {Object} obj - The object containing fields to translate
 * @param {Array<string>} fieldsToTranslate - Array of field names to translate
 * @param {string} targetLanguageCode - The target language code
 * @returns {Promise<Object>} - The object with translated fields
 */
const translateObjectFields = async (obj, fieldsToTranslate, targetLanguageCode) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // If language is English, return original object
  if (!targetLanguageCode || 
      targetLanguageCode.toLowerCase() === 'en' || 
      targetLanguageCode.toLowerCase() === 'eng' || 
      targetLanguageCode.toLowerCase() === 'english') {
    return obj;
  }

  const translatedObj = { ...obj };

  // Translate each field in parallel
  const translationPromises = fieldsToTranslate.map(async (field) => {
    if (obj[field] && typeof obj[field] === 'string' && obj[field].trim() !== '') {
      translatedObj[field] = await translateText(obj[field], targetLanguageCode);
    }
  });

  await Promise.all(translationPromises);

  return translatedObj;
};

module.exports = {
  translateText,
  translateObjectFields,
};
