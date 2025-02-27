const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const activityLogSchema = new Schema({
  userID: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    enum: [
      "restrict_work_eligibility",
      "approve_work_eligibility",
      "resume_approved",
      "resume_rejected",
      "edited_user",
      "resident_hired",
      "resident_terminated",
      "application_rejected",
      "interview_requested",
      "employment_requested",
      "termination_requested",
      "termination_request_denied",
      "interview_scheduled",
      "clearance_requested",
      "clearance_approved",
      "clearance_restricted",
      "note_added",
      "changed_password",
      "added_user",
      "edited_user",
      "deleted_user",
      "submitted_resume",
      "submitted_application",
      "edited_position",
      "added_position",
      "deleted_position",
    ],
    required: true,
  },
  color: {
    type: String,
    required: true,
    default: "text-success", // Default color if not provided
  },

  timestamp: {
    type: Date,
    default: Date.now,
  },
  details: {
    type: String, // Additional details (e.g., "Job applied: Construction Worker")
  },
});

const ActivityLog = mongoose.model("activityLog", activityLogSchema);
module.exports = ActivityLog;
