const cron = require("node-cron");
const Notification = require("../models/Notification");

// Define how many days old notifications should be deleted
const DAYS_BEFORE_DELETION = 30;

// Run every day at midnight to delete old notifications
cron.schedule("0 0 * * *", async () => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_BEFORE_DELETION);

    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
    });

    console.log(`Deleted ${result.deletedCount} old notifications.`);
  } catch (error) {
    console.error("Error deleting old notifications:", error);
  }
});
