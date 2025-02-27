const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");
const ActivityLog = require("../models/ActivityLog");

const {
  getEmployeeEmails,
  sendNotificationsToEmployers,
  getResidentProfileInfo,
} = require("../utils/clearanceUtils");

const {
  getUserNotifications,
  notificationIsRead,
} = require("../utils/notificationUtils");

module.exports = {
  async notifications(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      console.log(notifications);

      res.render(`${req.session.user.role}/notifications`, {
        user: req.session.user,
        notifications,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  // Controller function to mark a notification as read
  async markNotificationAsRead(req, res) {
    try {
      const { notificationId } = req.params;

      await notificationIsRead(notificationId);
      res.status(200).send("Notification marked as read");
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).send("Failed to mark notification as read");
    }
  },
};
