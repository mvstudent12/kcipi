const express = require("express");
const adminRoutes = express.Router();
const controller = require("../controllers/adminControllers");

//authentication middleware
const { requireAuth, checkUser } = require("../middleware/authMiddleware");

adminRoutes.get("/dashboard", checkUser, requireAuth, controller.dashboard);

adminRoutes.get(
  "/residentProfile/:id",
  checkUser,
  requireAuth,
  controller.residentProfile
);

adminRoutes.post(
  "/rejectResume/:id",
  checkUser,
  requireAuth,
  controller.rejectResume
);

adminRoutes.post(
  "/approveResume/:id",
  checkUser,
  requireAuth,
  controller.approveResume
);

module.exports = adminRoutes;
