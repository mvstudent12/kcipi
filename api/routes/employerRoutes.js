const express = require("express");
const employerRoutes = express.Router();
const controller = require("../controllers/employerControllers");

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
  requireRole(["employer"]),
];

//=============================
//   Employer Dashboard
//=============================

employerRoutes.get("/dashboard", authMiddleware, controller.dashboard);

//=============================
//   Manage Positions
//=============================

employerRoutes.get(
  "/managePositions",
  authMiddleware,
  controller.managePositions
);
employerRoutes.post(
  "/searchPosition",
  authMiddleware,
  controller.searchPosition
);
employerRoutes.post(
  "/editSearchedPosition/:jobID",
  authMiddleware,
  controller.editSearchedPosition
);
employerRoutes.post(
  "/addNewPosition",
  authMiddleware,
  controller.addNewPosition
);

employerRoutes.get("/jobProfile/:jobID", authMiddleware, controller.jobProfile);

employerRoutes.post(
  "/editPosition/:jobID",
  authMiddleware,
  controller.editPosition
);

employerRoutes.post(
  "/deletePosition/:jobID",
  authMiddleware,
  controller.deletePosition
);
//=============================
//   Manage Workforce
//=============================

employerRoutes.get(
  "/manageWorkForce",
  authMiddleware,
  controller.manageWorkForce
);

employerRoutes.get("/employees", authMiddleware, controller.employees);

//=============================
//   Resident Profile
//=============================

employerRoutes.get(
  "/residentProfile/:residentID",
  authMiddleware,
  controller.residentProfile
);

employerRoutes.post(
  "/requestInterview/:applicationID",
  authMiddleware,
  controller.requestInterview
);

employerRoutes.post(
  "/requestHire/:applicationID",
  authMiddleware,
  controller.requestHire
);

employerRoutes.post(
  "/requestTermination/:res_id",
  authMiddleware,
  controller.requestTermination
);

employerRoutes.get(
  "/rejectHire/:res_id/:applicationID",
  authMiddleware,
  controller.rejectHire
);

//=============================
//   Reports
//=============================

employerRoutes.get("/reports", authMiddleware, controller.reports);
employerRoutes.post(
  "/interviewReport",
  authMiddleware,
  controller.interviewReport
);

employerRoutes.post(
  "/employedResidentsReport",
  authMiddleware,
  controller.employedResidentsReport
);

employerRoutes.post(
  "/applicantsReport",
  authMiddleware,
  controller.applicantsReport
);

module.exports = employerRoutes;
