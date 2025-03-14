const Notification = require("../models/Notification");
const {
  getUserNotifications,
  getAllUserNotifications,
} = require("../utils/notificationUtils");

module.exports = {
  async notifications(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const allNotifications = await getAllUserNotifications(
        req.session.user.email,
        req.session.user.role
      );

      res.render(`shared/notifications`, {
        user: req.session.user,
        notifications,
        allNotifications,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  // Controller function to mark a notification as read
  async markNotificationAsRead(req, res) {
    const { notificationId } = req.params;
    try {
      //mark notification as read
      const notification = await Notification.findByIdAndUpdate(
        { _id: notificationId },
        { isRead: true },
        { new: true }
      );
      //redirect to notification link
      res.redirect(notification.data);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.render("error/500");
    }
  },
  async markAllAsRead(req, res) {
    const { email } = req.params;
    try {
      //mark all notifications as read
      await Notification.updateMany(
        { recipient: email, isRead: false }, // Find unread notifications for the email
        { $set: { isRead: true } } // Mark them as read
      );
      //redirect to notification link
      res.redirect("/notification/notifications");
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.render("error/500");
    }
  },
};
