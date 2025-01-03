const express = require("express");
const clearanceRoutes = express.Router();
const controller = require("../controllers/clearanceControllers");

//authentication middleware
const { requireAuth, checkUser } = require("../middleware/authMiddleware");

clearanceRoutes.get("/dashboard", checkUser, requireAuth, controller.dashboard);

clearanceRoutes.get(
  "/residentProfile/:id",
  checkUser,
  requireAuth,
  controller.residentProfile
);

clearanceRoutes.post(
  "/rejectResume/:id",
  checkUser,
  requireAuth,
  controller.rejectResume
);

clearanceRoutes.post(
  "/approveResume/:id",
  checkUser,
  requireAuth,
  controller.approveResume
);

clearanceRoutes.post(
  "/approveEligibility/:id",
  checkUser,
  requireAuth,
  controller.approveResume
);

module.exports = clearanceRoutes;
