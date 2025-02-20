const express = require("express");
const residentRoutes = express.Router();
const controller = require("../controllers/residentControllers");

//authentication middleware
const {
  requireResidentAuth,
  checkResident,
  requireResidentRole,
} = require("../middleware/authMiddleware");

residentRoutes.get("*", checkResident);

residentRoutes.post("*", checkResident);

residentRoutes.get(
  "/dashboard",
  requireResidentRole(["resident"]),
  checkResident,
  requireResidentAuth,
  controller.dashboard
);

residentRoutes.get(
  "/profile",
  requireResidentRole(["resident"]),
  checkResident,
  requireResidentAuth,
  controller.profile
);

residentRoutes.post(
  "/saveResume",
  requireResidentRole(["resident"]),
  checkResident,
  requireResidentAuth,
  controller.saveResume
);

residentRoutes.get(
  "/applications",
  requireResidentRole(["resident"]),
  checkResident,
  requireResidentAuth,
  controller.applications
);

residentRoutes.get(
  "/faq",
  requireResidentRole(["resident"]),
  checkResident,
  requireResidentAuth,
  controller.faq
);

residentRoutes.get(
  "/recentActivities",
  requireResidentRole(["resident"]),
  checkResident,
  requireResidentAuth,
  controller.recentActivities
);

residentRoutes.get(
  "/jobInfo/:jobID",
  requireResidentRole(["resident"]),
  checkResident,
  requireResidentAuth,
  controller.jobInfo
);

residentRoutes.post(
  "/saveApplication/:jobID",
  requireResidentRole(["resident"]),
  checkResident,
  requireResidentAuth,
  controller.saveApplication
);

module.exports = residentRoutes;
