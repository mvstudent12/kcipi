const express = require("express");
const adminRoutes = express.Router();
const controller = require("../controllers/adminControllers");

const sessionSecurity = require("../middleware/sessionSecurity");

//authentication middleware
const {
  checkUser,
  requireAuth,
  requireRole,
} = require("../middleware/authMiddleware");

const authMiddleware = [
  checkUser,
  requireAuth,
  sessionSecurity,
  requireRole(["admin"]),
];

adminRoutes.get("/dashboard", authMiddleware, controller.dashboard);
adminRoutes.get("/analytics", authMiddleware, controller.analytics);
adminRoutes.get("/resumeData", authMiddleware, controller.resumeData);
adminRoutes.get("/employmentData", authMiddleware, controller.employmentData);

adminRoutes.get("/helpDesk", authMiddleware, controller.helpDesk);
adminRoutes.get("/contact", authMiddleware, controller.contact);
adminRoutes.get("/logs", authMiddleware, controller.logs);
adminRoutes.get("/manageWorkForce", authMiddleware, controller.manageWorkForce);
adminRoutes.get("/manageClearance", authMiddleware, controller.manageClearance);
adminRoutes.get("/residentTables", authMiddleware, controller.residentTables);
adminRoutes.get(
  "/employedResidents",
  authMiddleware,
  controller.employedResidents
);
adminRoutes.get("/unitTeamTables", authMiddleware, controller.unitTeamTables);
adminRoutes.get(
  "/classificationTables",
  authMiddleware,
  controller.classificationTables
);
adminRoutes.get(
  "/facility_managementTables",
  authMiddleware,
  controller.facility_managementTables
);

adminRoutes.get("/employerTables", authMiddleware, controller.employerTables);
adminRoutes.get("/companyTables", authMiddleware, controller.companyTables);
//=============================
//   Profile Routes
//=============================
adminRoutes.get(
  "/employerProfile/:id",
  authMiddleware,
  controller.employerProfile
);
adminRoutes.get(
  "/unitTeamProfile/:id",
  authMiddleware,
  controller.unitTeamProfile
);
adminRoutes.get(
  "/classificationProfile/:id",
  authMiddleware,
  controller.classificationProfile
);
adminRoutes.get(
  "/facility_managementProfile/:id",
  authMiddleware,
  controller.facility_managementProfile
);
adminRoutes.get("/adminProfile/:id", authMiddleware, controller.adminProfile);
//=============================
//   DB Routes
//=============================
//facility_managementDB =======

adminRoutes.get(
  "/facility_managementDB",
  authMiddleware,
  controller.facility_managementDB
);

adminRoutes.post(
  "/addFacility_Management",
  authMiddleware,
  controller.addFacility_Management
);

adminRoutes.post(
  "/searchFacility_ManagementName",
  authMiddleware,
  controller.searchFacility_ManagementName
);

adminRoutes.post(
  "/saveFacility_ManagementEdit",
  authMiddleware,
  controller.saveFacility_ManagementEdit
);
adminRoutes.post(
  "/deleteFacility_Management/:facility_managementID",
  authMiddleware,
  controller.deleteFacility_Management
);
adminRoutes.post(
  "/resetFacility_ManagementPassword/:facility_managementID",
  authMiddleware,
  controller.resetFacility_ManagementPassword
);
//classificationDB =====================

adminRoutes.get(
  "/classificationDB",
  authMiddleware,
  controller.classificationDB
);

adminRoutes.post(
  "/addClassification",
  authMiddleware,
  controller.addClassification
);

adminRoutes.post(
  "/searchClassificationName",
  authMiddleware,
  controller.searchClassificationName
);

adminRoutes.post(
  "/saveClassificationEdit",
  authMiddleware,
  controller.saveClassificationEdit
);
adminRoutes.post(
  "/deleteClassification/:classificationID",
  authMiddleware,
  controller.deleteClassification
);
adminRoutes.post(
  "/resetClassificationPassword/:classificationID",
  authMiddleware,
  controller.resetClassificationPassword
);
//employerDB =====================

adminRoutes.get("/employerDB", authMiddleware, controller.employerDB);

adminRoutes.post("/addEmployer", authMiddleware, controller.addEmployer);

adminRoutes.post(
  "/searchEmployerName",
  authMiddleware,
  controller.searchEmployerName
);

adminRoutes.post(
  "/saveEmployerEdit",
  authMiddleware,
  controller.saveEmployerEdit
);
adminRoutes.post(
  "/deleteEmployer/:employerID",
  authMiddleware,
  controller.deleteEmployer
);
adminRoutes.post(
  "/resetEmployerPassword/:employerID",
  authMiddleware,
  controller.resetEmployerPassword
);

//residentsDB =====================

adminRoutes.get("/residentDB", authMiddleware, controller.residentDB);

adminRoutes.post("/addResident", authMiddleware, controller.addResident);
adminRoutes.post(
  "/searchResidentID",
  authMiddleware,
  controller.searchResidentID
);

adminRoutes.post(
  "/editExistingResident",
  authMiddleware,
  controller.editExistingResident
);

//companiesDB ==================
adminRoutes.get(
  "/companyProfile/:companyID",
  authMiddleware,
  controller.companyProfile
);

adminRoutes.get("/companyDB", authMiddleware, controller.companyDB);

adminRoutes.post("/addCompany", authMiddleware, controller.addCompany);

adminRoutes.post(
  "/searchCompanyName",
  authMiddleware,
  controller.searchCompanyName
);

adminRoutes.post(
  "/saveCompanyEdit",
  authMiddleware,
  controller.saveCompanyEdit
);

adminRoutes.post("/addNewPosition", authMiddleware, controller.addNewPosition);
adminRoutes.post(
  "/deleteCompany/:companyID",
  authMiddleware,
  controller.deleteCompany
);

//unitTeamDB ===================
adminRoutes.get("/unitTeamDB", authMiddleware, controller.unitTeamDB);

adminRoutes.post(
  "/searchUnitTeamName",
  authMiddleware,
  controller.searchUnitTeamName
);

adminRoutes.post("/addUnitTeam", authMiddleware, controller.addUnitTeam);

adminRoutes.post(
  "/saveUnitTeamEdit",
  authMiddleware,
  controller.saveUnitTeamEdit
);
adminRoutes.post(
  "/deleteUnitTeam/:unitTeamID",
  authMiddleware,
  controller.deleteUnitTeam
);
adminRoutes.post(
  "/resetUnitTeamPassword/:unitTeamID",
  authMiddleware,
  controller.resetUnitTeamPassword
);
//adminDB ===================
adminRoutes.get("/adminDB", authMiddleware, controller.adminDB);

adminRoutes.post(
  "/searchAdminName",
  authMiddleware,
  controller.searchAdminName
);

adminRoutes.post("/addAdmin", authMiddleware, controller.addAdmin);

adminRoutes.post("/saveAdminEdit", authMiddleware, controller.saveAdminEdit);
adminRoutes.post(
  "/deleteAdmin/:adminID",
  authMiddleware,
  controller.deleteAdmin
);
adminRoutes.post(
  "/resetAdminPassword/:adminID",
  authMiddleware,
  controller.resetAdminPassword
);
//=============================
//   Reports
//=============================
adminRoutes.get("/reports", authMiddleware, controller.reports);
adminRoutes.post("/residentReport", authMiddleware, controller.residentReport);

adminRoutes.post(
  "/employedResidentsReport",
  authMiddleware,
  controller.employedResidentsReport
);

adminRoutes.post(
  "/applicantsReport",
  authMiddleware,
  controller.applicantsReport
);

module.exports = adminRoutes;
