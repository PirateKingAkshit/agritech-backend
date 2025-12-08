const axios = require("axios");
const ApiError = require("../utils/error");
const dotenv = require("dotenv");
const { translateObjectFields } = require("../utils/translateUtil");
dotenv.config();

const fetchWithRetry = async (url, retries = 3, timeout = 90000) => {
  while (retries--) {
    try {
      return await axios.get(url, { timeout });
    } catch (error) {
      if (retries === 0) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000)); // wait 2 sec
    }
  }
};

const getMandiPriceService = async (req, res) => {
  const { state, district, market, commodity } = req.query;
  const language = "en";

  const apiKey = process.env.MANDI_API_KEY;

  // Base URL
  let url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=1000`;

  // Dynamic filters object
  const filters = {
    "state.keyword": state,
    district,
    market,
    commodity,
  };

  // Append only filters that have values
  for (const key in filters) {
    if (filters[key]) {
      url += `&filters%5B${encodeURIComponent(key)}%5D=${encodeURIComponent(filters[key])}`;
    }
  }

  try {
  const response = await fetchWithRetry(url);

  if (response?.status === 200) {
    let records = response.data.records;

    // 🔥 Sort by commodity
    records = records.sort((a, b) => a.commodity.localeCompare(b.commodity));

    if (language === "en") return records;

    const fieldsToTranslate = [
      "state",
      "district",
      "market",
      "commodity",
      "variety",
    ];

    return await Promise.all(
      records.map(async (record) => {
        return translateObjectFields(record, fieldsToTranslate, language);
      })
    );
  }
} catch (error) {
  console.log(error);
  throw new ApiError("Failed to fetch mandi price", 500);
}

};


module.exports = { getMandiPriceService };
