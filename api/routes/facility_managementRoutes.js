const express = require("express");
const facility_managementRoutes = express.Router();
const controller = require("../controllers/facility_managementControllers");

//authentication middleware
const {
  requireAuth,
  checkUser,
  requireRole,
} = require("../middleware/authMiddleware");

facility_managementRoutes.get(
  "/dashboard",
  checkUser,
  requireAuth,
  requireRole(["facility_management"]),
  controller.dashboard
);

facility_managementRoutes.get(
  "/helpDesk",
  checkUser,
  requireAuth,
  requireRole(["facility_management"]),
  controller.helpDesk
);

facility_managementRoutes.get(
  "/contact",
  checkUser,
  requireAuth,
  requireRole(["facility_management"]),
  controller.contact
);

facility_managementRoutes.get(
  "/manageWorkForce",
  checkUser,
  requireAuth,
  requireRole(["facility_management"]),
  controller.manageWorkForce
);

facility_managementRoutes.get(
  "/manageClearance",
  checkUser,
  requireAuth,
  requireRole(["facility_management"]),
  controller.manageClearance
);
//=========================
// ROSTERS
//=========================

facility_managementRoutes.get(
  "/residents",
  checkUser,
  requireAuth,
  requireRole(["facility_management"]),
  controller.residents
);

facility_managementRoutes.get(
  "/resumes",
  checkUser,
  requireAuth,
  requireRole(["facility_management"]),
  controller.resumes
);

facility_managementRoutes.get(
  "/clearance",
  checkUser,
  requireAuth,
  requireRole(["facility_management"]),
  controller.clearance
);

facility_managementRoutes.get(
  "/applicants",
  checkUser,
  requireAuth,
  requireRole(["facility_management"]),
  controller.applicants
);

facility_managementRoutes.get(
  "/employees",
  checkUser,
  requireAuth,
  requireRole(["facility_management"]),
  controller.employees
);
//=========================
// Reports
//=========================

facility_managementRoutes.get(
  "/reports",
  checkUser,
  requireAuth,
  requireRole(["facility_management"]),
  controller.reports
);
facility_managementRoutes.post(
  "/residentReport",
  checkUser,
  requireAuth,
  requireRole(["facility_management"]),
  controller.residentReport
);

facility_managementRoutes.post(
  "/employedResidentsReport",
  checkUser,
  requireAuth,
  requireRole(["facility_management"]),
  controller.employedResidentsReport
);

facility_managementRoutes.post(
  "/applicantsReport",
  checkUser,
  requireAuth,
  requireRole(["facility_management"]),
  controller.applicantsReport
);

module.exports = facility_managementRoutes;
