const express = require("express");
const clearanceRoutes = express.Router();
const controller = require("../controllers/clearanceControllers");

//authentication middleware
const {
  requireAuth,
  checkUser,
  requireRole,
} = require("../middleware/authMiddleware");

clearanceRoutes.get("/dashboard", checkUser, requireAuth, controller.dashboard);

//serves resident clearance profile to admin and unit team
clearanceRoutes.get(
  "/residentProfile/:residentID",
  checkUser,
  requireAuth,
  requireRole(["unitTeam", "facility_management", "classifications", "admin"]),
  controller.residentProfile
);

clearanceRoutes.post(
  "/rejectResume/:id",
  checkUser,
  requireAuth,
  requireRole(["unitTeam", "facility_management", "classifications", "admin"]),
  controller.rejectResume
);

clearanceRoutes.post(
  "/approveResume/:id",
  checkUser,
  requireAuth,
  requireRole(["unitTeam", "facility_management", "classifications", "admin"]),
  controller.approveResume
);
clearanceRoutes.post(
  "/editClearance/:residentID/:dept",
  checkUser,
  requireAuth,
  requireRole(["unitTeam", "facility_management", "classifications", "admin"]),
  controller.editClearance
);
clearanceRoutes.post(
  "/approveEligibility/:residentID",
  checkUser,
  requireAuth,
  requireRole(["unitTeam", "facility_management", "classifications", "admin"]),
  controller.approveEligibility
);
clearanceRoutes.post(
  "/rejectEligibility/:residentID",
  checkUser,
  requireAuth,
  requireRole(["unitTeam", "facility_management", "classifications", "admin"]),
  controller.rejectEligibility
);

clearanceRoutes.post(
  "/scheduleInterview/:jobID",
  checkUser,
  requireAuth,
  requireRole(["unitTeam", "facility_management", "classifications", "admin"]),
  controller.scheduleInterview
);
clearanceRoutes.post(
  "/hireResident/:id/:jobID",
  checkUser,
  requireAuth,
  requireRole(["unitTeam", "facility_management", "classifications", "admin"]),
  controller.hireResident
);
clearanceRoutes.get(
  "/rejectHire/:res_id/:jobID",
  checkUser,
  requireAuth,
  requireRole(["unitTeam", "facility_management", "classifications", "admin"]),
  controller.rejectHire
);
clearanceRoutes.post(
  "/terminateResident/:id",
  checkUser,
  requireAuth,
  requireRole(["unitTeam", "facility_management", "classifications", "admin"]),
  controller.terminateResident
);

clearanceRoutes.get(
  "/cancelTerminationRequest/:res_id",
  checkUser,
  requireAuth,
  requireRole(["unitTeam", "facility_management", "classifications", "admin"]),
  controller.cancelTerminationRequest
);

clearanceRoutes.post(
  "/editResident",
  checkUser,
  requireAuth,
  requireRole(["unitTeam", "facility_management", "classifications", "admin"]),
  controller.editResident
);

clearanceRoutes.get(
  "/findNotes/:residentID/:dept",
  checkUser,
  requireAuth,
  requireRole(["unitTeam", "facility_management", "classifications", "admin"]),
  controller.findNotes
);
clearanceRoutes.post(
  "/addNotes/:residentID/:dept",
  checkUser,
  requireAuth,
  requireRole(["unitTeam", "facility_management", "classifications", "admin"]),
  controller.addNotes
);

module.exports = clearanceRoutes;
