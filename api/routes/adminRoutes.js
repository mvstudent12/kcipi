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
const { requireAuth, checkUser } = require("../middleware/authMiddleware");

adminRoutes.get("/dashboard", checkUser, requireAuth, controller.dashboard);

adminRoutes.get("/helpDesk", checkUser, requireAuth, controller.helpDesk);

adminRoutes.get("/contact", checkUser, requireAuth, controller.contact);

adminRoutes.get("/logs", checkUser, requireAuth, controller.logs);

adminRoutes.get(
  "/manageWorkForce",
  checkUser,
  requireAuth,
  controller.manageWorkForce
);

adminRoutes.get(
  "/manageClearance",
  checkUser,
  requireAuth,
  controller.manageClearance
);

adminRoutes.get(
  "/residentTables",
  checkUser,
  requireAuth,
  controller.residentTables
);
adminRoutes.get(
  "/employedResidents",
  checkUser,
  requireAuth,
  controller.employedResidents
);

adminRoutes.get(
  "/unitTeamTables",
  checkUser,
  requireAuth,
  controller.unitTeamTables
);

adminRoutes.get(
  "/employerTables",
  checkUser,
  requireAuth,
  controller.employerTables
);

adminRoutes.get(
  "/companyTables",
  checkUser,
  requireAuth,
  controller.companyTables
);
//=============================
//   Profile Routes
//=============================
adminRoutes.get(
  "/employerProfile/:id",
  checkUser,
  requireAuth,
  controller.employerProfile
);

adminRoutes.get(
  "/unitTeamProfile/:id",
  checkUser,
  requireAuth,
  controller.unitTeamProfile
);

//=============================
//   DB Routes
//=============================
//employerDB =====================

adminRoutes.get("/employerDB", checkUser, requireAuth, controller.employerDB);

adminRoutes.post(
  "/addEmployer",
  checkUser,
  requireAuth,
  controller.addEmployer
);

adminRoutes.post(
  "/searchEmployerName",
  checkUser,
  requireAuth,
  controller.searchEmployerName
);

adminRoutes.post(
  "/saveEmployerEdit",
  checkUser,
  requireAuth,
  controller.saveEmployerEdit
);

//residentsDB =====================

adminRoutes.get("/residentDB", checkUser, requireAuth, controller.residentDB);

adminRoutes.post(
  "/updateAllResidentsDB",
  upload.single("csvfile"),
  checkUser,
  requireAuth,
  controller.updateAllResidentsDB
);

adminRoutes.post(
  "/addResident",
  checkUser,
  requireAuth,
  controller.addResident
);
adminRoutes.post("/searchResidentID", requireAuth, controller.searchResidentID);

adminRoutes.post(
  "/editExistingResident",
  requireAuth,
  controller.editExistingResident
);

//companiesDB ==================
adminRoutes.get(
  "/companyProfile/:id",
  checkUser,
  requireAuth,
  controller.companyProfile
);

adminRoutes.get("/companyDB", checkUser, requireAuth, controller.companyDB);

adminRoutes.post("/addCompany", requireAuth, controller.addCompany);

adminRoutes.post(
  "/searchCompanyName",
  requireAuth,
  controller.searchCompanyName
);

adminRoutes.post("/saveCompanyEdit", requireAuth, controller.saveCompanyEdit);

adminRoutes.post("/addNewPosition", requireAuth, controller.addNewPosition);

//unitTeamDB ===================
adminRoutes.get("/unitTeamDB", checkUser, requireAuth, controller.unitTeamDB);

adminRoutes.post(
  "/searchUnitTeamName",
  checkUser,
  requireAuth,
  controller.searchUnitTeamName
);

adminRoutes.post("/addUnitTeam", requireAuth, controller.addUnitTeam);

adminRoutes.post("/saveUnitTeamEdit", requireAuth, controller.saveUnitTeamEdit);

module.exports = adminRoutes;
