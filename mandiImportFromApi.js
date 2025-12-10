const axios = require("axios");
const mongoose = require("mongoose");
const os = require("os");
const path = require("path");

// ✅ Always load .env from project root
require("dotenv").config({
  path: path.resolve(process.cwd(), ".env"),
});

// ------------------------------
// MODELS
// ------------------------------
const District = require("./models/districtModel");
const Market = require("./models/marketModel");
const Commodity = require("./models/commodityModel");

// ------------------------------
// CPU LOAD
// ------------------------------
function getCpuLoad() {
  if (os.platform() === "win32") {
    const cpus = os.cpus();
    let idle = 0,
      total = 0;
    cpus.forEach((cpu) => {
      for (let t in cpu.times) total += cpu.times[t];
      idle += cpu.times.idle;
    });
    return 1 - idle / total;
  }
  return os.loadavg()[0] / os.cpus().length;
}

function getDynamicConcurrency() {
  const load = getCpuLoad();
  if (load < 0.4) return 15;
  if (load < 0.7) return 10;
  if (load < 1.0) return 5;
  return 2;
}

// ------------------------------
// RETRY API FUNCTION
// ------------------------------
async function fetchRetry(url, attempts = 3) {
  while (attempts--) {
    try {
      return await axios.get(url, { timeout: 60000 });
    } catch (err) {
      console.log("❌ Fetch failed:", err.message);
      if (!attempts) return null;
    }
  }
  return null;
}

// ------------------------------
// PROGRESS BAR
// ------------------------------
let lastRender = 0;
function renderProgress(current, total, cpuLoad, concurrency) {
  const now = Date.now();
  if (now - lastRender < 120) return;
  lastRender = now;

  const percent = ((current / total) * 100).toFixed(1);
  const barSize = 30;
  const filled = Math.round((current / total) * barSize);
  const bar = "█".repeat(filled) + "░".repeat(barSize - filled);

  process.stdout.write(
    `\r📡 Fetching Pages: [${bar}] ${percent}% | ${current}/${total} | CPU: ${(cpuLoad * 100).toFixed(0)}% | Concurrency: ${concurrency}`
  );
}

// ------------------------------
// DYNAMIC CONCURRENCY RUNNER
// ------------------------------
async function dynamicConcurrencyRunner(tasks) {
  const results = [];
  let active = 0;
  let index = 0;
  let completed = 0;

  return new Promise((resolve) => {
    const tick = () => {
      const cpuLoad = getCpuLoad();
      const limit = getDynamicConcurrency();

      renderProgress(completed, tasks.length, cpuLoad, limit);

      if (index >= tasks.length && active === 0) {
        console.log("\n✅ Fetching completed.");
        return resolve(results);
      }

      while (active < limit && index < tasks.length) {
        const i = index++;
        active++;

        tasks[i]()
          .then((res) => {
            results[i] = res;
            active--;
            completed++;
            setImmediate(tick);
          })
          .catch(() => {
            active--;
            completed++;
            setImmediate(tick);
          });
      }

      setTimeout(tick, 100);
    };

    tick();
  });
}

// =========================================================
//                    MAIN CRON JOB
// =========================================================
async function runMandiCronJob() {
  console.log("🚀 MANDI CRON STARTED\n");

  console.log("🔑 API KEY =", process.env.MANDI_API_KEY);

  await mongoose.connect(process.env.MONGO_URI);

  // Load all districts from DB (STATIC)
  const districts = await District.find().lean();
  const districtMap = Object.fromEntries(
    districts.map((d) => [d.name.toLowerCase(), d._id])
  );

  console.log(`📌 Loaded ${districts.length} districts from DB`);

  // 1. Get total pages
  const API_URL =
    "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

  const firstUrl = `${API_URL}?api-key=${process.env.MANDI_API_KEY}&format=json&limit=1`;

  console.log("🔍 Testing API URL:", firstUrl);

  const firstRes = await fetchRetry(firstUrl);

  console.log("🔍 First API response:", firstRes?.data);

  if (!firstRes?.data?.total) {
    console.log("❌ Failed to get total count.");
    return process.exit(1);
  }

  const total = firstRes.data.total;
  const limit = 1000;
  const pages = Math.ceil(total / limit);

  console.log(`📡 Total ${total} records | Pages: ${pages}`);

  // 2. Generate fetch tasks
  const tasks = [];
  for (let i = 0; i < pages; i++) {
    const offset = i * limit;
    const url = `${API_URL}?api-key=${process.env.MANDI_API_KEY}&format=json&limit=${limit}&offset=${offset}`;
    tasks.push(() => fetchRetry(url));
  }

  // 3. Run them with concurrency
  const responses = await dynamicConcurrencyRunner(tasks);

  const valid = responses.filter((r) => r?.data?.records);

  if (valid.length === 0) {
    console.log("❌ No valid API response received.");
    return;
  }

  let marketMap = new Map();
  let commodityMap = new Map();

  // 4. Build Market + Commodity collections
  for (const res of valid) {
    for (const r of res.data.records) {
      const district = r.district?.trim().toLowerCase();
      const market = r.market?.trim();
      const commodity = r.commodity?.trim();

      if (!district || !market || !commodity) continue;

      if (!districtMap[district]) continue; // ignore districts not in static list

      const districtId = districtMap[district];

      // unique key: district + market
      marketMap.set(`${district}|${market}`, { market, districtId });
      commodityMap.set(`${market}|${commodity}`, { market, commodity });
    }
  }

  console.log("\n📦 Market & Commodity extracted.");

  // 5. Insert new data
  await Market.deleteMany({});
  await Commodity.deleteMany({});

  const insertedMarkets = await Market.insertMany(
    [...marketMap.values()].map((m) => ({
      name: m.market,
      district: m.districtId,
    }))
  );

  const marketIdMap = Object.fromEntries(
    insertedMarkets.map((m) => [m.name.toLowerCase(), m._id])
  );

  await Commodity.insertMany(
    [...commodityMap.values()].map((c) => ({
      name: c.commodity,
      market: marketIdMap[c.market.toLowerCase()],
    }))
  );

  console.log("\n🎉 MARKET & COMMODITY UPDATED SUCCESSFULLY");

  mongoose.connection.close();
}

runMandiCronJob();
