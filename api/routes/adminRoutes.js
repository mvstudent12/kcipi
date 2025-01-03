const express = require("express");
const adminRoutes = express.Router();
const controller = require("../controllers/adminControllers");

//authentication middleware
const { requireAuth, checkUser } = require("../middleware/authMiddleware");

adminRoutes.get("/dashboard", checkUser, requireAuth, controller.dashboard);

adminRoutes.get("/helpDesk", checkUser, requireAuth, controller.helpDesk);

adminRoutes.get("/contact", checkUser, requireAuth, controller.contact);

adminRoutes.get(
  "/residentTables",
  checkUser,
  requireAuth,
  controller.residentTables
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

//=============================
//   DB Routes
//=============================

adminRoutes.get("/employerDB", checkUser, requireAuth, controller.employerDB);

adminRoutes.get("/residentDB", checkUser, requireAuth, controller.residentDB);

adminRoutes.get("/unitTeamDB", checkUser, requireAuth, controller.unitTeamDB);

module.exports = adminRoutes;
