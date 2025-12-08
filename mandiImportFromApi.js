const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();
const os = require("os");

// ------------------------------
// CPU UTILIZATION (cross-platform)
// ------------------------------
function getCpuLoad() {
  // Windows fallback (loadavg useless)
  if (os.platform() === "win32") {
    const cpus = os.cpus();
    let totalIdle = 0,
      totalTick = 0;

    cpus.forEach((cpu) => {
      for (let type in cpu.times) totalTick += cpu.times[type];
      totalIdle += cpu.times.idle;
    });

    return 1 - totalIdle / totalTick; // returns 0 to 1
  }

  // Linux / Mac → real load
  return os.loadavg()[0] / os.cpus().length;
}

// ------------------------------
// DYNAMIC CONCURRENCY MANAGER
// ------------------------------
function getDynamicConcurrency() {
  const load = getCpuLoad(); // 0 = free, 1 = fully busy

  if (load < 0.4) return 15; // cool
  if (load < 0.7) return 10; // moderate
  if (load < 1.0) return 5; // busy
  return 2; // overheated
}

// ------------------------------
// CONCURRENCY RUNNER (safe, non-recursive)
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
      
      // Render progress bar
      renderProgress(completed, tasks.length, cpuLoad, limit);

      if (index >= tasks.length && active === 0) {
        console.log("\n✅ Fetching completed.");
        return resolve(results);
      }

      while (active < limit && index < tasks.length) {
        const i = index++;
        active++;

        tasks[i]().then((res) => {
          results[i] = res;
          active--;
          completed++;
          setImmediate(tick); // safe recursion
        });
      }

      setTimeout(tick, 100);
    };

    tick();
  });
}


const State = require("./models/stateModel");
const District = require("./models/districtModel");
const Market = require("./models/marketModel");
const Commodity = require("./models/commodityModel");

const API_URL =
  "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";
const API_KEY = process.env.MANDI_API_KEY;

// -------------------------------------
// SUPER FAST RETRY ROUTINE
// -------------------------------------
async function fetchRetry(url, attempts = 3) {
  while (attempts--) {
    try {
      return await axios.get(url, { timeout: 60000 });
    } catch (_) {
      if (!attempts) return null;
    }
  }
  return null;
}

// ------------------------------
// LIVE PROGRESS BAR
// ------------------------------
let lastRender = 0;

function renderProgress(current, total, cpuLoad, concurrency) {
  const now = Date.now();

  // update every 120ms → smooth and non-blocking
  if (now - lastRender < 120) return;

  lastRender = now;

  const percent = ((current / total) * 100).toFixed(1);

  const barSize = 30;
  const filled = Math.round((current / total) * barSize);
  const bar = "█".repeat(filled) + "░".repeat(barSize - filled);

  process.stdout.write(
    `\r📡 Fetching Pages: [${bar}] ${percent}% | ${current}/${total} ` +
    `| CPU: ${(cpuLoad * 100).toFixed(0)}% ` +
    `| Concurrency: ${concurrency}   `
  );
}


// -------------------------------------
// MAIN JOB
// -------------------------------------
async function runMandiCronJob() {
  console.time("TOTAL_TIME");
  console.log("🚀 ULTRA FAST MANDI CRON STARTED");

  await mongoose.connect(process.env.MONGO_URI);

  // 1. GET TOTAL COUNT
  const firstUrl = `${API_URL}?api-key=${API_KEY}&format=json&limit=1`;
  const firstRes = await fetchRetry(firstUrl);

  if (!firstRes?.data?.total) {
    console.error("❌ API failed.");
    return process.exit(1);
  }

  const total = firstRes.data.total;
  const limit = 1000;
  const pages = Math.ceil(total / limit);

  console.log(`📡 Total ${total} records | Pages: ${pages}`);

  // 2. TASKS
  const tasks = [];
  for (let i = 0; i < pages; i++) {
    const offset = i * limit;
    const url = `${API_URL}?api-key=${API_KEY}&format=json&limit=${limit}&offset=${offset}`;
    tasks.push(() => fetchRetry(url));
  }

  // 3. FETCH WITH DYNAMIC CONCURRENCY
  const responses = await dynamicConcurrencyRunner(tasks);
  const valid = responses.filter((r) => r?.data?.records);

  if (valid.length === 0) return console.log("❌ All API fetches failed.");

  // 4. Dedup
  const stateSet = new Set();
  const districtMap = new Map();
  const marketMap = new Map();
  const commodityMap = new Map();

  for (const res of valid) {
    for (const r of res.data.records) {
      const state = r.state?.trim();
      const district = r.district?.trim();
      const market = r.market?.trim();
      const commodity = r.commodity?.trim();

      if (!state || !district || !market || !commodity) continue;

      stateSet.add(state);
      districtMap.set(`${state}|${district}`, { state, district });
      marketMap.set(`${district}|${market}`, { district, market });
      commodityMap.set(`${market}|${commodity}`, { market, commodity });
    }
  }

  // 5. BACKUP
  console.log("🛟 Creating backup…");

  const [oldStates, oldDistricts, oldMarkets, oldCommodities] =
    await Promise.all([
      State.find().lean(),
      District.find().lean(),
      Market.find().lean(),
      Commodity.find().lean(),
    ]);

  console.log("🛟 Backup done.");

  // 6. DELETE + INSERT (with rollback)
  console.time("DB_WRITE");

  try {
    await Promise.all([
      State.deleteMany({}),
      District.deleteMany({}),
      Market.deleteMany({}),
      Commodity.deleteMany({}),
    ]);

    const insertedStates = await State.insertMany(
      [...stateSet].map((name) => ({ name })),
      { ordered: false }
    );
    const stateId = Object.fromEntries(
      insertedStates.map((s) => [s.name, s._id])
    );

    const insertedDistricts = await District.insertMany(
      [...districtMap.values()].map((d) => ({
        name: d.district,
        state: stateId[d.state],
      })),
      { ordered: false }
    );
    const districtId = Object.fromEntries(
      insertedDistricts.map((d) => [d.name, d._id])
    );

    const insertedMarkets = await Market.insertMany(
      [...marketMap.values()].map((m) => ({
        name: m.market,
        district: districtId[m.district],
      })),
      { ordered: false }
    );
    const marketId = Object.fromEntries(
      insertedMarkets.map((m) => [m.name, m._id])
    );

    await Commodity.insertMany(
      [...commodityMap.values()].map((c) => ({
        name: c.commodity,
        market: marketId[c.market],
      })),
      { ordered: false }
    );

    console.timeEnd("DB_WRITE");
    console.log("🎉 MANDI UPDATE SUCCESSFUL");
  } catch (err) {
    console.error("❌ FAILED — Rolling back…", err);

    await Promise.all([
      State.deleteMany({}),
      District.deleteMany({}),
      Market.deleteMany({}),
      Commodity.deleteMany({}),
    ]);

    await State.insertMany(oldStates);
    await District.insertMany(oldDistricts);
    await Market.insertMany(oldMarkets);
    await Commodity.insertMany(oldCommodities);

    console.log("🛟 ROLLBACK COMPLETE.");
  }

  mongoose.connection.close();
  console.timeEnd("TOTAL_TIME");
}

runMandiCronJob();
