const express = require("express");
const facility_managementRoutes = express.Router();
const controller = require("../controllers/facility_managementControllers");

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
  requireRole(["facility_management"]),
];

//=============================
// Facility Management Routes
//=============================

facility_managementRoutes.get(
  "/dashboard",
  authMiddleware,
  controller.dashboard
);

facility_managementRoutes.get(
  "/manageWorkForce",
  authMiddleware,
  controller.manageWorkForce
);

facility_managementRoutes.get(
  "/manageClearance",
  authMiddleware,
  controller.manageClearance
);

facility_managementRoutes.get(
  "/residents",
  authMiddleware,
  controller.residents
);

facility_managementRoutes.get("/resumes", authMiddleware, controller.resumes);

facility_managementRoutes.get(
  "/clearance",
  authMiddleware,
  controller.clearance
);

facility_managementRoutes.get("/cleared", authMiddleware, controller.cleared);

facility_managementRoutes.get(
  "/applicants",
  authMiddleware,
  controller.applicants
);

facility_managementRoutes.get(
  "/employees",
  authMiddleware,
  controller.employees
);

facility_managementRoutes.get("/reports", authMiddleware, controller.reports);

facility_managementRoutes.post(
  "/residentReport",
  authMiddleware,
  controller.residentReport
);

facility_managementRoutes.post(
  "/employedResidentsReport",
  authMiddleware,
  controller.employedResidentsReport
);

facility_managementRoutes.post(
  "/applicantsReport",
  authMiddleware,
  controller.applicantsReport
);

module.exports = facility_managementRoutes;
