const express = require("express");
const authRoutes = express.Router();
const sessionSecurity = require("../middleware/sessionSecurity");
const controller = require("../controllers/authControllers");

//authentication middleware
const {
  requireAuth,
  requireResidentAuth,
  checkUser,
  checkResident,
} = require("../middleware/authMiddleware");

//=======================================================
//========     Non-Resident Auth Routes      ============
//=======================================================

authRoutes.get("/", controller.index); //serves non-resident admin login page

authRoutes.post("/login", controller.login); //checks if non-resident exists

authRoutes.get("/thankYou", controller.thankYou); //serves thank you page

authRoutes.get(
  "/user/dashboard/:id",
  checkUser,
  requireAuth,
  sessionSecurity,
  controller.userDashboard
); //serves non-resident dashboard

authRoutes.get(
  "/logOut",
  checkUser,
  requireAuth,
  sessionSecurity,
  controller.logOut
); //logs nonresident out

//========================================================
//============     Resident Auth Routes      =============
//========================================================

authRoutes.get("/resident", controller.residentIndex); //serves resident login page

authRoutes.post("/residentLogin", controller.residentLogin); //checks if resident exists

authRoutes.get(
  "/residentLogOut",
  checkResident,
  requireResidentAuth,
  sessionSecurity,
  controller.residentLogOut
); //logs resident out

module.exports = authRoutes;
