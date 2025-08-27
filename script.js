const connectDB = require("./config/db");
const State = require("./models/stateModel");
const District = require("./models/districtModel");
const Market = require("./models/marketModel");
const Commodity = require("./models/commodityModel");
const fs = require("fs");
const csv = require("csv-parser");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();
// --- DB Connection ---
connectDB().then(() => {
  console.log("✅ Connected to MongoDB");
});

// --- Import Function ---
async function processCSV(filePath) {
  const records = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => records.push(row))
    .on("end", async () => {
      // Cache to avoid duplicate queries
      const stateCache = new Map();
      const districtCache = new Map();
      const marketCache = new Map();

      for (const row of records) {
        const {
          State: stateName,
          District: districtName,
          Market: marketName,
          Commodity: commodityName,
        } = row;

        // --- State ---
        let state = stateCache.get(stateName);
        if (!state) {
          state =
            (await State.findOne({ name: stateName })) ||
            (await State.create({ name: stateName }));
          stateCache.set(stateName, state);
        }

        // --- District ---
        const districtKey = `${districtName}-${state._id}`;
        let district = districtCache.get(districtKey);
        if (!district) {
          district =
            (await District.findOne({
              name: districtName,
              state: state._id,
            })) ||
            (await District.create({ name: districtName, state: state._id }));
          districtCache.set(districtKey, district);
        }

        // --- Market ---
        const marketKey = `${marketName}-${district._id}`;
        let market = marketCache.get(marketKey);
        if (!market) {
          market =
            (await Market.findOne({
              name: marketName,
              district: district._id,
            })) ||
            (await Market.create({ name: marketName, district: district._id }));
          marketCache.set(marketKey, market);
        }

        // --- Commodity ---
        let commodity = await Commodity.findOne({
          name: commodityName,
          market: market._id,
        });
        if (!commodity) {
          commodity = await Commodity.create({
            name: commodityName,
            market: market._id,
          });
        }
      }

      console.log("✅ CSV import completed!");
      mongoose.disconnect();
    });
}

processCSV("first.csv");
