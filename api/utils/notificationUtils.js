//=============================
//    Global Imports
//=============================
const UnitTeam = require("../models/UnitTeam");
const Notification = require("../models/Notification");
const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");

//=============================
//     Helper Functions
//=============================
async function createNotification(email, role, type, message, data = {}) {
  try {
    // Define icon mapping based on notification type
    const iconMapping = {
      position_created: "bi-check-circle",
      employment_request: "bi-exclamation-circle",
      termination_request: "bi-x-circle",
      termination_request_denied: "bi-x-circle",
      resident_hired: "bi-check-circle",
      resident_rejected: "bi-x-circle",
      resident_terminated: "bi-x-circle",
      clearance_approved: "bi-check-circle",
      clearance_denied: "bi-x-circle",
      clearance_requested: "bi-exclamation-circle",
      interview_request: "bi-exclamation-circle",
      interview_scheduled: "bi-check-circle",
      interview_cancelled: "bi-x-circle",
    };

    const notification = new Notification({
      recipient: email,
      role,
      type,
      icon: iconMapping[type] || "bi-exclamation-circle", // Default icon if type is missing
      message,
      data,
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw new Error("Failed to create notification");
  }
}

async function getUserNotifications(email, role) {
  return await Notification.find({
    recipient: email,
    role: role,
  })
    .lean()
    .sort({ createdAt: -1 });
}

module.exports = {
  getUserNotifications,
  createNotification,
};
