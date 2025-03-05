// Removes expired interviews from database every night at midnight
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const Jobs = require("../models/Jobs");

const logFilePath = path.join(__dirname, "cleanup.log"); // Log file

cron.schedule("0 0 * * *", async () => {
  try {
    const now = new Date();
    const jobs = await Jobs.find({
      "applicants.interview.dateScheduled": { $lt: now },
    });

    let logData = `\n[${new Date().toISOString()}] Deleted Interviews:\n`;

    for (let job of jobs) {
      let updated = false; // Flag to track if job needs saving

      job.applicants = job.applicants.map((applicant) => {
        const expiredInterview = applicant.interview?.dateScheduled < now;

        if (expiredInterview) {
          logData += `Job ID: ${job._id}, Company: ${job.companyName}, Resident: ${applicant.residentName}, Scheduled Date: ${applicant.interview.dateScheduled}\n`;

          // Clear expired interview details but keep the applicant
          applicant.interview = {
            status: "none", // Reset status to "none"
          };
          updated = true; // Mark job as updated
        }
        return applicant;
      });

      if (updated) await job.save(); // Save only if there were updates
    }

    // Log deleted interviews
    fs.appendFileSync(logFilePath, logData, "utf8");

    console.log("Expired interviews removed and logged.");
  } catch (error) {
    console.error("Error removing expired interviews:", error);
  }
});
