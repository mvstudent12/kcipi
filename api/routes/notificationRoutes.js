const express = require("express");
const notificationRoutes = express.Router();
const controller = require("../controllers/notificationControllers");

const sessionSecurity = require("../middleware/sessionSecurity");

//authentication middleware
const {
  requireAuth,
  checkUser,
  requireRole,
} = require("../middleware/authMiddleware");

const authMiddleware = [
  checkUser,
  requireAuth,
  sessionSecurity,
  requireRole([
    "unitTeam",
    "facility_management",
    "classification",
    "employer",
  ]),
];

//=============================
// Notification Routes
//=============================

notificationRoutes.get(
  "/notifications",
  checkUser,
  requireAuth,
  authMiddleware,
  controller.notifications
);

notificationRoutes.get(
  "/markAsRead/:notificationId",
  checkUser,
  requireAuth,
  authMiddleware,
  controller.markNotificationAsRead
);

module.exports = notificationRoutes;
