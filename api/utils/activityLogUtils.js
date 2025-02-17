//=============================
//    Global Imports
//=============================
const UnitTeam = require("../models/UnitTeam");
const Notification = require("../models/Notification");
const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");
const ActivityLog = require("../models/ActivityLog");

//=============================
//     Helper Functions
//=============================

async function createActivityLog(userID, action, details) {
  try {
    // Define a map to associate action types with colors
    const actionColorMap = {
      termination_request_denied: "text-warning",
      restrict_work_eligibility: "text-danger",
      approve_work_eligibility: "text-success",
      resume_approved: "text-success",
      resume_rejected: "text-danger",
      edited_resident: "text-primary",
      resident_hired: "text-info",
      resident_terminated: "text-warning",
      application_rejected: "text-muted",
      interview_requested: "text-secondary",
      termination_requested: "text-dark",
      interview_scheduled: "text-primary",
      clearance_requested: "text-warning",
      clearance_approved: "text-success",
      clearance_restricted: "text-danger",
      note_added: "text-info",
    };

    const activity = new ActivityLog({
      userID,
      action,
      details,
      color: actionColorMap[action] || "text-success", // Default color if type is missing
    });

    await activity.save();
    return activity;
  } catch (error) {
    console.error("Error creating activity:", error);
    throw new Error("Failed to create activity");
  }
}

module.exports = {
  createActivityLog,
};
