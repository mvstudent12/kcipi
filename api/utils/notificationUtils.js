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

// Function to create a notification
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

// Function to fetch user notifications by email and role
async function getUserNotifications(email, role) {
  try {
    return await Notification.find({
      recipient: email,
      role: role,
    })
      .lean()
      .sort({ createdAt: -1 });
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    throw new Error("Failed to fetch notifications");
  }
}

// Function to fetch unread notifications for a user by email and role
async function getUnreadNotifications(email, role) {
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

// Function to mark a single notification as read
async function notificationIsRead(notificationId) {
  try {
    console.log(notificationId);
    await Notification.findByIdAndUpdate(notificationId, { isRead: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw new Error("Failed to mark notification as read");
  }
}

// Function to mark all notifications for a user as read
async function markAllNotificationsAsRead(email, role) {
  try {
    await Notification.updateMany(
      { recipient: email, role: role, isRead: false },
      { isRead: true }
    );
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw new Error("Failed to mark all notifications as read");
  }
}

module.exports = {
  getUserNotifications,
  getUnreadNotifications,
  createNotification,
  notificationIsRead,
  markAllNotificationsAsRead,
};
