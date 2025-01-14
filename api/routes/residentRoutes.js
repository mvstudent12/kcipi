const express = require("express");
const residentRoutes = express.Router();
const controller = require("../controllers/residentControllers");

//authentication middleware
const {
  requireResidentAuth,
  checkResident,
} = require("../middleware/authMiddleware");

residentRoutes.get("*", checkResident);

residentRoutes.post("*", checkResident);

residentRoutes.get("/dashboard", requireResidentAuth, controller.dashboard);

residentRoutes.get("/profile", requireResidentAuth, controller.profile);

residentRoutes.post("/saveResume", requireResidentAuth, controller.saveResume);

residentRoutes.get(
  "/applications",
  requireResidentAuth,
  controller.applications
);

residentRoutes.get("/faq", requireResidentAuth, controller.faq);

residentRoutes.get("/jobInfo/:jobID", requireResidentAuth, controller.jobInfo);

residentRoutes.post(
  "/saveApplication/:jobID",
  requireResidentAuth,
  controller.saveApplication
);

module.exports = residentRoutes;
