const cron = require("node-cron");
const Notification = require("../models/Notification");

// Define how many hours old read notifications should be deleted
const HOURS_BEFORE_DELETION = 48;

// Run every day at midnight to delete old read notifications
cron.schedule("0 0 * * *", async () => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - HOURS_BEFORE_DELETION);

    // Delete read notifications that are older than 48 hours
    const result = await Notification.deleteMany({
      isRead: true, // Ensure the notification is marked as read
      createdAt: { $lt: cutoffDate }, // Ensure the notification is older than 48 hours
    });

    console.log(
      `Deleted ${result.deletedCount} read notifications older than 48 hours.`
    );
  } catch (error) {
    console.error("Error deleting old read notifications:", error);
  }
});
