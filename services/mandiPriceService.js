const axios = require("axios");
const Error = require("../utils/error");
const dotenv = require("dotenv");
dotenv.config();

const getMandiPriceService = async (req, res) => {
  const { state, district, market, commodity } = req.query;
  if (!state || !district || !market || !commodity) {
    throw new Error(
      "Please provide state, district, market and commodity",
      400
    );
  }
  const apiKey = process.env.MANDI_API_KEY;
  console.log("API Key:", apiKey)
  const format = "json";
  const limit = 1000;
  const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=${format}&limit=${limit}&filters%5Bstate.keyword%5D=${state}&filters%5Bdistrict%5D=${district}&filters%5Bmarket%5D=${market}&filters%5Bcommodity%5D=${commodity}`;
  try {
    const response = await axios.get(url);
    if (response?.status === 200 && response?.statusText === "OK") {
      return response?.data?.records;
    }
  } catch (error) {
    console.log(error);

    throw new Error("Failed to fetch mandi price", 500);
  }
};

module.exports = { getMandiPriceService };
