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
  "/analytics",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.analytics
);
adminRoutes.get(
  "/chartData",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.chartData
);
adminRoutes.get(
  "/employmentData",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.employmentData
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
  "/classificationTables",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.classificationTables
);
adminRoutes.get(
  "/facility_managementTables",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.facility_managementTables
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
adminRoutes.get(
  "/classificationProfile/:id",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.classificationProfile
);
adminRoutes.get(
  "/facility_managementProfile/:id",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.facility_managementProfile
);
adminRoutes.get(
  "/adminProfile/:id",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.adminProfile
);
//=============================
//   DB Routes
//=============================
//facility_managementDB =======

adminRoutes.get(
  "/facility_managementDB",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.facility_managementDB
);

adminRoutes.post(
  "/addFacility_Management",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.addFacility_Management
);

adminRoutes.post(
  "/searchFacility_ManagementName",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.searchFacility_ManagementName
);

adminRoutes.post(
  "/saveFacility_ManagementEdit",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.saveFacility_ManagementEdit
);
adminRoutes.post(
  "/deleteFacility_Management/:facility_managementID",
  requireAuth,
  requireRole(["admin"]),
  controller.deleteFacility_Management
);
adminRoutes.post(
  "/resetFacility_ManagementPassword/:facility_managementID",
  requireAuth,
  requireRole(["admin"]),
  controller.resetFacility_ManagementPassword
);
//classificationDB =====================

adminRoutes.get(
  "/classificationDB",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.classificationDB
);

adminRoutes.post(
  "/addClassification",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.addClassification
);

adminRoutes.post(
  "/searchClassificationName",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.searchClassificationName
);

adminRoutes.post(
  "/saveClassificationEdit",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.saveClassificationEdit
);
adminRoutes.post(
  "/deleteClassification/:classificationID",
  requireAuth,
  requireRole(["admin"]),
  controller.deleteClassification
);
adminRoutes.post(
  "/resetClassificationPassword/:classificationID",
  requireAuth,
  requireRole(["admin"]),
  controller.resetClassificationPassword
);
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
adminRoutes.post(
  "/deleteEmployer/:employerID",
  requireAuth,
  requireRole(["admin"]),
  controller.deleteEmployer
);
adminRoutes.post(
  "/resetEmployerPassword/:employerID",
  requireAuth,
  requireRole(["admin"]),
  controller.resetEmployerPassword
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
adminRoutes.post(
  "/deleteCompany/:companyID",
  requireAuth,
  requireRole(["admin"]),
  controller.deleteCompany
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
adminRoutes.post(
  "/deleteUnitTeam/:unitTeamID",
  requireAuth,
  requireRole(["admin"]),
  controller.deleteUnitTeam
);
adminRoutes.post(
  "/resetUnitTeamPassword/:unitTeamID",
  requireAuth,
  requireRole(["admin"]),
  controller.resetUnitTeamPassword
);
//adminDB ===================
adminRoutes.get(
  "/adminDB",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.adminDB
);

adminRoutes.post(
  "/searchAdminName",
  checkUser,
  requireAuth,
  requireRole(["admin"]),
  controller.searchAdminName
);

adminRoutes.post(
  "/addAdmin",
  requireAuth,
  requireRole(["admin"]),
  controller.addAdmin
);

adminRoutes.post(
  "/saveAdminEdit",
  requireAuth,
  requireRole(["admin"]),
  controller.saveAdminEdit
);
adminRoutes.post(
  "/deleteAdmin/:adminID",
  requireAuth,
  requireRole(["admin"]),
  controller.deleteAdmin
);
adminRoutes.post(
  "/resetAdminPassword/:adminID",
  requireAuth,
  requireRole(["admin"]),
  controller.resetAdminPassword
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
