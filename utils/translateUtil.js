const { Translate } = require('@google-cloud/translate').v2;
const translateFallback = require('google-translate-api-x');
const ApiError = require('./error');
const crypto = require("crypto");
const  LANG_MAP  = require('./Lang_Map');
require('dotenv').config();


// init google
let client = null;
const { GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_CLOUD_PROJECT_ID, GOOGLE_CLOUD_API_KEY } = process.env;

if (GOOGLE_APPLICATION_CREDENTIALS || GOOGLE_CLOUD_PROJECT_ID || GOOGLE_CLOUD_API_KEY) {
  try {
    client = new Translate({
      ...(GOOGLE_APPLICATION_CREDENTIALS && { keyFilename: GOOGLE_APPLICATION_CREDENTIALS }),
      ...(GOOGLE_CLOUD_PROJECT_ID && { projectId: GOOGLE_CLOUD_PROJECT_ID }),
      ...(GOOGLE_CLOUD_API_KEY && { key: GOOGLE_CLOUD_API_KEY }),
    });
    console.log("✅ Google Cloud Translate initialized");
  } catch (err) {
    console.log("⚠️ Failed to initialize Google Cloud Translate:", err.message);
  }
}

// ========================= CACHE =============================
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const _cache = new Map();

const makeKey = (lang, text) => {
  return crypto.createHash("sha1").update(lang + "::" + text).digest("hex");
};

const getCached = (lang, text) => {
  const key = makeKey(lang, text);
  const entry = _cache.get(key);

  if (!entry) return null;
  if (Date.now() > entry.expires) {
    _cache.delete(key);
    return null;
  }

  return entry.value;
};

const setCached = (lang, text, result) => {
  const key = makeKey(lang, text);
  _cache.set(key, {
    value: result,
    expires: Date.now() + CACHE_TTL,
  });
};
// ========================= END CACHE =========================

// helpers
const getValueByPath = (obj, path) => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

const setValueByPath = (obj, path, value) => {
  const parts = path.split('.');
  let ref = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    ref = ref[parts[i]];
  }
  ref[parts[parts.length - 1]] = value;
};

// single translator (kept same name)
const translateText = async (text, targetLang) => {
  if (!text?.trim()) throw new ApiError("Text cannot be empty", 400);
  if (!targetLang) throw new ApiError("Target language is required", 400);

  if (["en", "eng", "english"].includes(targetLang.toLowerCase())) return text;

  const lang = LANG_MAP[targetLang.toLowerCase()] || targetLang.toLowerCase();

  const cached = getCached(lang, text);
  if (cached) return cached;

  let translated;

  if (client) {
    try {
      const [t] = await client.translate(text, lang);
      translated = t || text;
      setCached(lang, text, translated);
      return translated;
    } catch (err) {
      console.log("Official API failed, using fallback:", err.message);
    }
  }

  try {
    const r = await translateFallback(text, { to: lang });
    translated = r.text || text;
    setCached(lang, text, translated);
    return translated;
  } catch (err) {
    console.log("Translation failed:", err.message);
    throw new ApiError("Translation service unavailable", 500);
  }
};

// kept same name, but internal optimised per-object batching
const translateObjectFields = async (obj, fields, targetLang) => {
  if (["en", "eng", "english"].includes(targetLang.toLowerCase())) return obj;

  // ✅ normalize using LANG_MAP
  const lang = LANG_MAP[targetLang.toLowerCase()] || targetLang.toLowerCase();

  const translated = { ...obj };

  const toTranslate = [];
  const positions = [];
  const seen = new Map();

  fields.forEach((field) => {
    const originalVal = getValueByPath(obj, field);

    if (typeof originalVal === "string" && originalVal.trim()) {
      // ✅ use normalized lang for caching
      const cached = getCached(lang, originalVal);
      if (cached) {
        setValueByPath(translated, field, cached);
        return;
      }

      if (seen.has(originalVal)) {
        positions.push({ field, idx: seen.get(originalVal) });
      } else {
        const idx = toTranslate.length;
        seen.set(originalVal, idx);
        toTranslate.push(originalVal);
        positions.push({ field, idx });
      }
    }
  });

  if (!toTranslate.length) return translated;

  let resultTexts = [];

  if (client) {
    try {
      // ✅ use normalized lang for API
      const [res] = await client.translate(toTranslate, lang);
      resultTexts = Array.isArray(res) ? res : [res];
    } catch (err) {
      console.log("Official API batch failed:", err.message);
    }
  }

  if (!resultTexts.length) {
    resultTexts = await Promise.all(
      toTranslate.map(async (txt) => {
        const cached2 = getCached(lang, txt); // ✅ normalized lang
        if (cached2) return cached2;
        const r = await translateFallback(txt, { to: lang }); // ✅ normalized lang
        return r.text;
      })
    );
  }

  positions.forEach(({ field, idx }) => {
    const t = resultTexts[idx];
    setValueByPath(translated, field, t);
    setCached(lang, toTranslate[idx], t); // ✅ normalized lang
  });

  return translated;
};


// ---------------- GLOBAL ARRAY LEVEL OPTIMISATION ---------------------
// THIS replaces Promise.all loop
const translateArray = async (data, fieldsToTranslate, language) => {
  if (["en", "eng", "english"].includes(language.toLowerCase())) return data;

  const globalTextList = [];
  const globalIndexMap = [];

  data.forEach((item, itemIndex) => {
    fieldsToTranslate.forEach((field) => {
      const val = getValueByPath(item, field);

      if (typeof val === "string" && val.trim()) {
        const cached = getCached(language, val);
        if (cached) {
          setValueByPath(item, field, cached);
        } else {
          globalIndexMap.push({ itemIndex, field, val });
          globalTextList.push(val);
        }
      }
    });
  });

  if (!globalTextList.length) return data;

  let translations = [];

  if (client) {
    try {
      const [res] = await client.translate(globalTextList, language);
      translations = Array.isArray(res) ? res : [res];
    } catch (e) {
      console.log("global google batch failed:", e.message);
    }
  }

  if (!translations.length) {
    translations = await Promise.all(
      globalTextList.map(async (txt) => {
        const cached2 = getCached(language, txt);
        if (cached2) return cached2;
        const r = await translateFallback(txt, { to: language });
        return r.text;
      })
    );
  }

  globalIndexMap.forEach((m, idx) => {
    setValueByPath(data[m.itemIndex], m.field, translations[idx]);
    setCached(language, m.val, translations[idx]);
  });

  return data;
};

module.exports = {
  translateText,
  translateObjectFields,
  translateArray,
};
