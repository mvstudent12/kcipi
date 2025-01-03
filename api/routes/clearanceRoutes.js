const express = require("express");
const clearanceRoutes = express.Router();
const controller = require("../controllers/clearanceControllers");

//authentication middleware
const { requireAuth, checkUser } = require("../middleware/authMiddleware");

clearanceRoutes.get("/dashboard", checkUser, requireAuth, controller.dashboard);

//serves resident clearance profile to admin and unit team
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
  "/editClearance/:residentID/:dept",
  checkUser,
  requireAuth,
  controller.editClearance
);
clearanceRoutes.post(
  "/approveEligibility/:residentID",
  checkUser,
  requireAuth,
  controller.approveEligibility
);
clearanceRoutes.post(
  "/rejectEligibility/:residentID",
  checkUser,
  requireAuth,
  controller.rejectEligibility
);

module.exports = clearanceRoutes;
