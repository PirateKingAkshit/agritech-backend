const cron = require("node-cron");
const { spawn } = require("child_process");
require("dotenv").config();

// Convert "12:30 AM" or "1:00 PM" → cron format
function convertTimeToCron(timeString) {
  if (!timeString) {
    console.error("❌ CRON_TIME missing in .env");
    process.exit(1);
  }

  const [time, modifier] = timeString.trim().split(" ");
  let [hours, minutes] = time.split(":").map(Number);

  const isPM = modifier?.toUpperCase() === "PM";
  const isAM = modifier?.toUpperCase() === "AM";

  if (isNaN(hours) || isNaN(minutes) || (!isAM && !isPM)) {
    console.error("❌ Invalid CRON_TIME format. Example: 1:00 AM");
    process.exit(1);
  }

  // Convert 12-hour → 24-hour
  if (isPM && hours !== 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return `${minutes} ${hours} * * *`;
}


// Convert CRON_TIME (e.g., "1:00 AM") → cron ("0 1 * * *")
const cronString = convertTimeToCron(process.env.CRON_TIME);

console.log(`🕒 Using cron schedule: ${cronString}`);

// Schedule job
cron.schedule(cronString, () => {
  console.log("⏳ Running Mandi Cron Job...");

  const process = spawn("node", ["mandiImportFromApi.js"], {
    stdio: "inherit",
  });

  process.on("close", (code) => {
    console.log(`📌 Mandi script finished with code ${code}`);
  });
});

console.log("🟢 Cron scheduler started...");
