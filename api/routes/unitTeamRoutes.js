const express = require("express");
const unitTeamRoutes = express.Router();
const controller = require("../controllers/unitTeamControllers");

//authentication middleware
const {
  requireAuth,
  checkUser,
  requireRole,
} = require("../middleware/authMiddleware");

unitTeamRoutes.get(
  "/dashboard",
  checkUser,
  requireAuth,
  requireRole(["unitTeam"]),
  controller.dashboard
);

unitTeamRoutes.get(
  "/helpDesk",
  checkUser,
  requireAuth,
  requireRole(["unitTeam"]),
  controller.helpDesk
);

unitTeamRoutes.get(
  "/contact",
  checkUser,
  requireAuth,
  requireRole(["unitTeam"]),
  controller.contact
);

unitTeamRoutes.get(
  "/manageWorkForce",
  checkUser,
  requireAuth,
  requireRole(["unitTeam"]),
  controller.manageWorkForce
);

unitTeamRoutes.get(
  "/manageClearance",
  checkUser,
  requireAuth,
  requireRole(["unitTeam"]),
  controller.manageClearance
);
//=========================
// ROSTERS
//=========================

unitTeamRoutes.get(
  "/residents",
  checkUser,
  requireAuth,
  requireRole(["unitTeam"]),
  controller.residents
);

unitTeamRoutes.get(
  "/resumes",
  checkUser,
  requireAuth,
  requireRole(["unitTeam"]),
  controller.resumes
);

unitTeamRoutes.get(
  "/clearance",
  checkUser,
  requireAuth,
  requireRole(["unitTeam"]),
  controller.clearance
);

unitTeamRoutes.get(
  "/applicants",
  checkUser,
  requireAuth,
  requireRole(["unitTeam"]),
  controller.applicants
);

unitTeamRoutes.get(
  "/employees",
  checkUser,
  requireAuth,
  requireRole(["unitTeam"]),
  controller.employees
);
//=========================
// Reports
//=========================

unitTeamRoutes.get(
  "/reports",
  checkUser,
  requireAuth,
  requireRole(["unitTeam"]),
  controller.reports
);
unitTeamRoutes.post(
  "/residentReport",
  checkUser,
  requireAuth,
  requireRole(["unitTeam"]),
  controller.residentReport
);

unitTeamRoutes.post(
  "/employedResidentsReport",
  checkUser,
  requireAuth,
  requireRole(["unitTeam"]),
  controller.employedResidentsReport
);

module.exports = unitTeamRoutes;
