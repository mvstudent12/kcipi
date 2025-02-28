const {
  getUserNotifications,
  getAllUserNotifications,
  notificationIsRead,
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

      res.render(`${req.session.user.role}/notifications`, {
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
    try {
      const { notificationId } = req.params;

      await notificationIsRead(notificationId);
      console.log("here i am");
      res.status(200).json({
        success: true,
        message: "Notification marked as read",
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).send("Failed to mark notification as read");
    }
  },
};
