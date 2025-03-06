const express = require("express");
const classificationRoutes = express.Router();
const controller = require("../controllers/classificationControllers");

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
  requireRole(["classification"]),
];

classificationRoutes.get("/dashboard", authMiddleware, controller.dashboard);

classificationRoutes.get(
  "/manageWorkForce",
  authMiddleware,
  controller.manageWorkForce
);

classificationRoutes.get(
  "/manageClearance",
  authMiddleware,
  controller.manageClearance
);
//=========================
// ROSTERS
//=========================

classificationRoutes.get("/residents", authMiddleware, controller.residents);

classificationRoutes.get("/resumes", authMiddleware, controller.resumes);

classificationRoutes.get("/clearance", authMiddleware, controller.clearance);

classificationRoutes.get("/cleared", authMiddleware, controller.cleared);

classificationRoutes.get("/applicants", authMiddleware, controller.applicants);

classificationRoutes.get("/employees", authMiddleware, controller.employees);
//=========================
// Reports
//=========================

classificationRoutes.get("/reports", authMiddleware, controller.reports);
classificationRoutes.post(
  "/residentReport",
  authMiddleware,
  controller.residentReport
);

classificationRoutes.post(
  "/employedResidentsReport",
  authMiddleware,
  controller.employedResidentsReport
);

classificationRoutes.post(
  "/applicantsReport",
  authMiddleware,
  controller.applicantsReport
);

module.exports = classificationRoutes;
