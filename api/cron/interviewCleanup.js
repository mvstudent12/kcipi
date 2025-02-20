//removes expired interviews from database every night at midnight
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const Jobs = require("../models/Jobs");

const logFilePath = path.join(__dirname, "cleanup.log"); // Log file

cron.schedule("0 0 * * *", async () => {
  try {
    const now = new Date();
    const jobs = await Jobs.find({ "interviews.dateScheduled": { $lt: now } });

    let logData = `\n[${new Date().toISOString()}] Deleted Interviews:\n`;

    for (let job of jobs) {
      const expiredInterviews = job.interviews.filter(
        (interview) => interview.dateScheduled < now
      );

      if (expiredInterviews.length > 0) {
        logData += `Job ID: ${job._id}, Company: ${job.companyName}, Removed Interviews: ${expiredInterviews.length}\n`;

        // Remove expired interviews
        job.interviews = job.interviews.filter(
          (interview) => interview.dateScheduled >= now
        );
        await job.save();
      }
    }

    // Log deleted interviews
    fs.appendFileSync(logFilePath, logData, "utf8");

    console.log("Expired interviews removed and logged.");
  } catch (error) {
    console.error("Error removing expired interviews:", error);
  }
});
