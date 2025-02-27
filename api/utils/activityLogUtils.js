//=============================
//    Global Imports
//=============================

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
      submitted_resume: "text-info",
      submitted_application: "text-success",
      resident_hired: "text-info",
      resident_terminated: "text-danger",
      application_rejected: "text-muted",
      interview_requested: "text-secondary",
      employment_requested: "text-success",
      termination_requested: "text-danger",
      interview_scheduled: "text-primary",
      clearance_requested: "text-warning",
      clearance_approved: "text-success",
      clearance_restricted: "text-danger",
      note_added: "text-info",
      added_user: "text-info",
      edited_user: "text-warning",
      deleted_user: "text-danger",
      changed_password: "text-warning",
      edited_position: "text-info",
      added_position: "text-success",
      deleted_position: "text-warning",
    };

    const activity = new ActivityLog({
      userID,
      action,
      details,
      timestamp: new Date(),
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
