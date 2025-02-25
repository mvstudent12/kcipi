const express = require("express");
const residentRoutes = express.Router();
const controller = require("../controllers/residentControllers");

//authentication middleware
const {
  requireResidentAuth,
  checkResident,
  requireResidentRole,
} = require("../middleware/authMiddleware");

const sessionSecurity = require("../middleware/sessionSecurity");

const authMiddleware = [
  requireResidentAuth,
  checkResident,
  sessionSecurity,
  requireResidentRole(["resident"]),
];

residentRoutes.get("*", checkResident);

residentRoutes.post("*", checkResident);

residentRoutes.get("/dashboard", authMiddleware, controller.dashboard);

residentRoutes.get("/profile", authMiddleware, controller.profile);

residentRoutes.post("/saveResume", authMiddleware, controller.saveResume);

residentRoutes.get("/applications", authMiddleware, controller.applications);

residentRoutes.get("/faq", authMiddleware, controller.faq);

residentRoutes.get(
  "/recentActivities",
  authMiddleware,
  controller.recentActivities
);

residentRoutes.get("/jobInfo/:jobID", authMiddleware, controller.jobInfo);

residentRoutes.post(
  "/saveApplication/:jobID",
  authMiddleware,
  controller.saveApplication
);

module.exports = residentRoutes;
