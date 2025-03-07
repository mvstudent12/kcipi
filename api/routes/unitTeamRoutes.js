const express = require("express");
const unitTeamRoutes = express.Router();
const controller = require("../controllers/unitTeamControllers");

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
  requireRole(["unitTeam"]),
];
//=========================
// Unit Team Routes
//=========================

unitTeamRoutes.get("/dashboard", authMiddleware, controller.dashboard);

unitTeamRoutes.get(
  "/manageWorkForce",
  authMiddleware,
  controller.manageWorkForce
);
unitTeamRoutes.get(
  "/reviewInterviewRequest/:applicationID",
  authMiddleware,
  controller.reviewInterviewRequest
);
unitTeamRoutes.post(
  "/scheduleInterview/:applicationID",
  authMiddleware,
  controller.scheduleInterview
);
unitTeamRoutes.get(
  "/cancelInterviewRequest/:applicationID",
  authMiddleware,
  controller.cancelInterviewRequest
);
unitTeamRoutes.get(
  "/reviewHireRequest/:applicationID",
  authMiddleware,
  controller.reviewHireRequest
);
unitTeamRoutes.get(
  "/reviewTerminationRequest/:res_id",
  controller.reviewTerminationRequest
);
unitTeamRoutes.get(
  "/manageClearance",
  authMiddleware,
  controller.manageClearance
);

unitTeamRoutes.get("/residents", authMiddleware, controller.residents);

unitTeamRoutes.get("/resumes", authMiddleware, controller.resumes);

unitTeamRoutes.get("/clearance", authMiddleware, controller.clearance);

unitTeamRoutes.get("/cleared", authMiddleware, controller.cleared);

unitTeamRoutes.get("/applicants", authMiddleware, controller.applicants);

unitTeamRoutes.get("/employees", authMiddleware, controller.employees);

unitTeamRoutes.get("/reports", authMiddleware, controller.reports);

unitTeamRoutes.post(
  "/residentReport",
  authMiddleware,
  controller.residentReport
);

unitTeamRoutes.post(
  "/employedResidentsReport",
  authMiddleware,
  controller.employedResidentsReport
);

unitTeamRoutes.post(
  "/applicantsReport",
  authMiddleware,
  controller.applicantsReport
);

module.exports = unitTeamRoutes;
