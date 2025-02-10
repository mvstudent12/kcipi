const express = require("express");
const classificationRoutes = express.Router();
const controller = require("../controllers/classificationControllers");

//authentication middleware
const {
  requireAuth,
  checkUser,
  requireRole,
} = require("../middleware/authMiddleware");

classificationRoutes.get(
  "/dashboard",
  checkUser,
  requireAuth,
  requireRole(["classification"]),
  controller.dashboard
);

classificationRoutes.get(
  "/helpDesk",
  checkUser,
  requireAuth,
  requireRole(["classification"]),
  controller.helpDesk
);

classificationRoutes.get(
  "/contact",
  checkUser,
  requireAuth,
  requireRole(["classification"]),
  controller.contact
);

classificationRoutes.get(
  "/manageWorkForce",
  checkUser,
  requireAuth,
  requireRole(["classification"]),
  controller.manageWorkForce
);

classificationRoutes.get(
  "/manageClearance",
  checkUser,
  requireAuth,
  requireRole(["classification"]),
  controller.manageClearance
);
//=========================
// ROSTERS
//=========================

classificationRoutes.get(
  "/residents",
  checkUser,
  requireAuth,
  requireRole(["classification"]),
  controller.residents
);

classificationRoutes.get(
  "/resumes",
  checkUser,
  requireAuth,
  requireRole(["classification"]),
  controller.resumes
);

classificationRoutes.get(
  "/clearance",
  checkUser,
  requireAuth,
  requireRole(["classification"]),
  controller.clearance
);

classificationRoutes.get(
  "/applicants",
  checkUser,
  requireAuth,
  requireRole(["classification"]),
  controller.applicants
);

classificationRoutes.get(
  "/employees",
  checkUser,
  requireAuth,
  requireRole(["classification"]),
  controller.employees
);
//=========================
// Reports
//=========================

classificationRoutes.get(
  "/reports",
  checkUser,
  requireAuth,
  requireRole(["classification"]),
  controller.reports
);
classificationRoutes.post(
  "/residentReport",
  checkUser,
  requireAuth,
  requireRole(["classification"]),
  controller.residentReport
);

classificationRoutes.post(
  "/employedResidentsReport",
  checkUser,
  requireAuth,
  requireRole(["classification"]),
  controller.employedResidentsReport
);

classificationRoutes.post(
  "/applicantsReport",
  checkUser,
  requireAuth,
  requireRole(["classification"]),
  controller.applicantsReport
);

module.exports = classificationRoutes;
