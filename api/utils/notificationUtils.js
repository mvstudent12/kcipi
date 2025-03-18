//=============================
//    Global Imports
//=============================

const Notification = require("../models/Notification");

//=============================
//     Helper Functions
//=============================

// Function to create a notification
async function createNotification(
  email,
  role,
  type,
  message,
  data = {},
  session = null
) {
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
      resume_rejected: "bi-x-circle",
      resume_approved: "bi-check-circle",
      application_submitted: "bi-exclamation-circle",
      restrict_work_eligibility: "bi-x-circle",
      approve_work_eligibility: "bi-check-circle",
    };

    const notification = new Notification({
      recipient: email,
      role,
      type,
      icon: iconMapping[type] || "bi-exclamation-circle", // Default icon if type is missing
      message,
      data,
    });

    await notification.save({ session });
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw new Error("Failed to create notification");
  }
}

// Function to fetch user notifications by email and role
async function getAllUserNotifications(email, role) {
  try {
    return await Notification.find({
      recipient: email,
      role: role,
    })
      .lean()
      .sort({ createdAt: -1 })
      .limit(25); // Limit the result to 25 notifications;
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    throw new Error("Failed to fetch notifications");
  }
}

// Function to fetch unread notifications for a user by email and role
async function getUserNotifications(email, role) {
  try {
    return await Notification.find({
      recipient: email,
      role: role,
      isRead: false,
    })
      .lean()
      .sort({ createdAt: -1 });
  } catch (error) {
    console.error("Error fetching unread notifications:", error);
    throw new Error("Failed to fetch unread notifications");
  }
}

module.exports = {
  getAllUserNotifications,
  getUserNotifications,
  createNotification,
};
