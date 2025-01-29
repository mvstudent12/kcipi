const express = require("express");
const clearanceRoutes = express.Router();
const controller = require("../controllers/clearanceControllers");

//authentication middleware
const { requireAuth, checkUser } = require("../middleware/authMiddleware");

clearanceRoutes.get("/dashboard", checkUser, requireAuth, controller.dashboard);

//serves resident clearance profile to admin and unit team
clearanceRoutes.get(
  "/residentProfile/:residentID",
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

clearanceRoutes.post(
  "/scheduleInterview/:jobID",
  checkUser,
  requireAuth,
  controller.scheduleInterview
);
clearanceRoutes.get(
  "/hireResident/:id/:jobID",
  checkUser,
  requireAuth,
  controller.hireResident
);
clearanceRoutes.get(
  "/rejectHire/:id/:jobID",
  checkUser,
  requireAuth,
  controller.rejectHire
);
clearanceRoutes.post(
  "/terminateResident/:id",
  checkUser,
  requireAuth,
  controller.terminateResident
);

clearanceRoutes.post(
  "/editResident",
  checkUser,
  requireAuth,
  controller.editResident
);

module.exports = clearanceRoutes;
