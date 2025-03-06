const express = require("express");
const sharedRoutes = express.Router();
const controller = require("../controllers/sharedControllers");

//authentication middleware
const sessionSecurity = require("../middleware/sessionSecurity");

const {
  requireAuth,
  checkUser,
  requireRole,
} = require("../middleware/authMiddleware");

const authMiddlewareAll = [
  checkUser,
  requireAuth,
  sessionSecurity,
  requireRole([
    "unitTeam",
    "facility_management",
    "classification",
    "admin",
    "employer",
  ]),
];

const authMiddlewareKDOC = [
  checkUser,
  requireAuth,
  sessionSecurity,
  requireRole(["unitTeam", "facility_management", "classification", "admin"]),
];
//=============================================
//   SHARED ROUTES
//=============================================

sharedRoutes.get(
  "/residentProfile/:residentID",
  authMiddlewareKDOC,
  controller.residentProfile
);

sharedRoutes.get(
  "/recentActivities",
  authMiddlewareAll,
  controller.recentActivities
);

sharedRoutes.get("/helpDesk", authMiddlewareAll, controller.helpDesk);
sharedRoutes.get("/contact", authMiddlewareAll, controller.contact);

module.exports = sharedRoutes;
