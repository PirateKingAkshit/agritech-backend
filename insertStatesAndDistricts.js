const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const State = require("./models/stateModel");
const District = require("./models/districtModel");
console.log(process.env.MONGO_URI)

// Load static data (States + Districts)
const statesData = require("./statesWithDistricts.json");

async function insertStatesAndDistricts() {
  try {
    console.log("🚀 Starting State + District Import...");
    await mongoose.connect(process.env.MONGO_URI);

    // Clear old data
    await State.deleteMany({});
    await District.deleteMany({});
    console.log("🧹 Old data cleared.");

    // Insert states
    const insertedStates = await State.insertMany(
      statesData.map((s) => ({ name: s.state }))
    );
    console.log("✅ States inserted:", insertedStates.length);

    // Create mapping: stateName -> stateId
    const stateIdMap = Object.fromEntries(
      insertedStates.map((s) => [s.name.toLowerCase(), s._id])
    );

    // Prepare district insertion
    let districtDocs = [];

    for (const st of statesData) {
      const sid = stateIdMap[st.state.toLowerCase()];

      if (!sid) {
        console.log("⚠️ Missing state:", st.state);
        continue;
      }

      for (const dist of st.districts) {
        districtDocs.push({
          name: dist,
          state: sid,
        });
      }
    }

    const insertedDistricts = await District.insertMany(districtDocs);

    console.log("✅ Districts inserted:", insertedDistricts.length);

    console.log("🎉 State + District import completed successfully.");

    await mongoose.connection.close();
  } catch (err) {
    console.error("❌ Error importing states + districts:", err);
  }
}

insertStatesAndDistricts();
