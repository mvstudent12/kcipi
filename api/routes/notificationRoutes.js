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
  requireRole([
    "unitTeam",
    "facility_management",
    "classification",
    "admin",
    "employer",
  ]),
  controller.notifications
);

notificationRoutes.get(
  "/markAsRead/:notificationId",
  checkUser,
  requireAuth,
  requireRole([
    "unitTeam",
    "facility_management",
    "classification",
    "admin",
    "employer",
  ]),
  controller.markNotificationAsRead
);

module.exports = notificationRoutes;
