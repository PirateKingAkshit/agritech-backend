const cron = require("node-cron");
const { spawn } = require("child_process");

const cronString = "0 */3 * * *"; // every 3 hours

console.log(`🕒 Using cron schedule: ${cronString}`);

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
