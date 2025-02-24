const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new mongoose.Schema({
  recipient: { type: String, required: true }, // Stores the recipient's email
  role: {
    type: String,
    enum: [
      "admin",
      "unitTeam",
      "employer",
      "facility_management",
      "classification",
    ],
    required: true,
  }, // Stores the type of recipient
  type: {
    type: String,
    enum: [
      "position_created",
      "employment_request",
      "termination_request",
      "termination_request_denied",
      "resident_hired",
      "resident_rejected",
      "resident_terminated",
      "clearance_approved",
      "clearance_denied",
      "clearance_requested",
      "interview_request",
      "interview_scheduled",
      "interview_cancelled",
      "resume_rejected",
      "resume_approved",
      "restrict_work_eligibility",
      "approve_work_eligibility",
    ],
    required: true,
  },
  icon: {
    type: String,
    enum: [
      "bi-exclamation-circle",
      "bi-x-circle",
      "bi-check-circle",
      "bi-info-circle",
    ],
    default: "bi-exclamation-circle",
  },
  message: { type: String },
  data: { type: mongoose.Schema.Types.Mixed },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
