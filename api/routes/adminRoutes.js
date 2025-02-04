const express = require("express");
const adminRoutes = express.Router();
const controller = require("../controllers/adminControllers");

//csv file upload with multer
const multer = require("multer");

// Set up multer to store files
const upload = multer({
  dest: "uploads/", // Folder where CSV files will be stored temporarily
});

//authentication middleware
const {
  requireAuth,
  checkUser,
  requireRole,
} = require("../middleware/authMiddleware");

adminRoutes.get(
  "/dashboard",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.dashboard
);

adminRoutes.get(
  "/helpDesk",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.helpDesk
);

adminRoutes.get(
  "/contact",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.contact
);

adminRoutes.get(
  "/logs",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.logs
);

adminRoutes.get(
  "/manageWorkForce",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.manageWorkForce
);

adminRoutes.get(
  "/manageClearance",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.manageClearance
);

adminRoutes.get(
  "/residentTables",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.residentTables
);
adminRoutes.get(
  "/employedResidents",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.employedResidents
);

adminRoutes.get(
  "/unitTeamTables",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.unitTeamTables
);

adminRoutes.get(
  "/employerTables",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.employerTables
);

adminRoutes.get(
  "/companyTables",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.companyTables
);
//=============================
//   Profile Routes
//=============================
adminRoutes.get(
  "/employerProfile/:id",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.employerProfile
);

adminRoutes.get(
  "/unitTeamProfile/:id",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.unitTeamProfile
);

//=============================
//   DB Routes
//=============================
//employerDB =====================

adminRoutes.get(
  "/employerDB",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.employerDB
);

adminRoutes.post(
  "/addEmployer",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.addEmployer
);

adminRoutes.post(
  "/searchEmployerName",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.searchEmployerName
);

adminRoutes.post(
  "/saveEmployerEdit",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.saveEmployerEdit
);

//residentsDB =====================

adminRoutes.get(
  "/residentDB",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.residentDB
);

adminRoutes.post(
  "/updateAllResidentsDB",
  upload.single("csvfile"),
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.updateAllResidentsDB
);

adminRoutes.post(
  "/addResident",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.addResident
);
adminRoutes.post(
  "/searchResidentID",
  requireAuth,
  requireRole(["admin"]),
  controller.searchResidentID
);

adminRoutes.post(
  "/editExistingResident",
  requireAuth,
  requireRole(["admin"]),
  controller.editExistingResident
);

//companiesDB ==================
adminRoutes.get(
  "/companyProfile/:id",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.companyProfile
);

adminRoutes.get(
  "/companyDB",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.companyDB
);

adminRoutes.post(
  "/addCompany",
  requireAuth,
  requireRole(["admin"]),
  controller.addCompany
);

adminRoutes.post(
  "/searchCompanyName",
  requireAuth,
  requireRole(["admin"]),
  controller.searchCompanyName
);

adminRoutes.post(
  "/saveCompanyEdit",
  requireAuth,
  requireRole(["admin"]),
  controller.saveCompanyEdit
);

adminRoutes.post(
  "/addNewPosition",
  requireAuth,
  requireRole(["admin"]),
  controller.addNewPosition
);

//unitTeamDB ===================
adminRoutes.get(
  "/unitTeamDB",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.unitTeamDB
);

adminRoutes.post(
  "/searchUnitTeamName",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.searchUnitTeamName
);

adminRoutes.post(
  "/addUnitTeam",
  requireAuth,
  requireRole(["admin"]),
  controller.addUnitTeam
);

adminRoutes.post(
  "/saveUnitTeamEdit",
  requireAuth,
  requireRole(["admin"]),
  controller.saveUnitTeamEdit
);
//=============================
//   Reports
//=============================
adminRoutes.get(
  "/reports",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.reports
);
adminRoutes.post(
  "/residentReport",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.residentReport
);

adminRoutes.post(
  "/employedResidentsReport",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.employedResidentsReport
);

adminRoutes.post(
  "/applicantsReport",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.applicantsReport
);

module.exports = adminRoutes;
