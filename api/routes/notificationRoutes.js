const express = require("express");
const notificationRoutes = express.Router();
const controller = require("../controllers/notificationControllers");

//authentication middleware
const {
  requireAuth,
  checkUser,
  requireRole,
} = require("../middleware/authMiddleware");

notificationRoutes.get(
  "/notifications",
  checkUser,
  requireAuth,
  requireRole(["unitTeam", "facility_management", "classification", "admin"]),
  controller.notifications
);
notificationRoutes.patch(
  "/notifications/markAsRead/:notificationId",
  checkUser,
  requireAuth,

  controller.markNotificationAsRead
);

module.exports = notificationRoutes;
