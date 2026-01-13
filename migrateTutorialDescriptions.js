const mongoose = require("mongoose");
const tutorialsMasterModel = require("./models/tutorialsMasterModel");
const embedHtmlToShareHtml = require("./utils/embedHtmlToShareHtml");
const dotenv = require("dotenv");

(async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/agritech");
    console.log("✅ MongoDB connected");

    const tutorials = await tutorialsMasterModel.find({
      descriptionWeb: { $exists: false },
      description: { $exists: true },
    });

    console.log(`🔍 Found ${tutorials.length} tutorials to migrate`);

    for (const tutorial of tutorials) {
      const embedHtml = tutorial.description;

      tutorial.descriptionWeb = embedHtml; // OLD embed HTML
      tutorial.description = embedHtmlToShareHtml(embedHtml); // NEW share HTML

      await tutorial.save();
      console.log(`✅ Migrated tutorial: ${tutorial._id}`);
    }

    console.log("🎉 Migration completed successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed", err);
    process.exit(1);
  }
})();
