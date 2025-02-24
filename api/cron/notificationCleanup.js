const cron = require("node-cron");
const { deleteOldNotifications } = require("./services/notificationService");

// Run every day at midnight to delete old notifications
cron.schedule("0 0 * * *", async () => {
  try {
    await deleteOldNotifications(); // Call your delete function here
    console.log("Old notifications deleted successfully.");
  } catch (error) {
    console.error("Error deleting old notifications:", error);
  }
});
