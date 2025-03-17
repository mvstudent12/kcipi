const express = require("express");
const clearanceRoutes = express.Router();
const controller = require("../controllers/clearanceControllers");

//authentication middleware
const sessionSecurity = require("../middleware/sessionSecurity");

const {
  requireAuth,
  checkUser,
  requireRole,
} = require("../middleware/authMiddleware");

const authMiddleware = [
  checkUser,
  requireAuth,
  sessionSecurity,
  requireRole(["unitTeam", "facility_management", "classification", "admin"]),
];
//=========================
//  Clearance Routes
//=========================

clearanceRoutes.post(
  "/rejectResume/:residentID",
  authMiddleware,
  controller.rejectResume
);

clearanceRoutes.post(
  "/approveResume/:residentID",
  authMiddleware,
  controller.approveResume
);
clearanceRoutes.post(
  "/requestClearance/:residentID/:deptName",
  authMiddleware,
  controller.requestClearance
);
clearanceRoutes.post(
  "/editClearance/:residentID/:dept",
  authMiddleware,
  controller.editClearance
);

clearanceRoutes.post(
  "/scheduleInterview/:applicationID",
  authMiddleware,
  controller.scheduleInterview
);
clearanceRoutes.post(
  "/hireResident/:res_id/:applicationID",
  authMiddleware,
  controller.hireResident
);
clearanceRoutes.get(
  "/rejectHire/:res_id/:applicationID",
  authMiddleware,
  controller.rejectHire
);
clearanceRoutes.post(
  "/terminateResident/:res_id",
  authMiddleware,
  controller.terminateResident
);

clearanceRoutes.get(
  "/cancelTerminationRequest/:res_id",
  authMiddleware,
  controller.cancelTerminationRequest
);

clearanceRoutes.post("/editResident", authMiddleware, controller.editResident);

clearanceRoutes.get(
  "/findNotes/:residentID/:dept",
  authMiddleware,
  controller.findNotes
);
clearanceRoutes.post(
  "/addNotes/:residentID/:dept",
  authMiddleware,
  controller.addNotes
);

module.exports = clearanceRoutes;
