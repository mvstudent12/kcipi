const express = require("express");
const authRoutes = express.Router();
const controller = require("../controllers/authControllers");
//authentication middleware
const {
  requireAuth,
  checkUser,
  checkResident,
} = require("../middleware/authMiddleware");

//=======================================================
//========     Non-Resident Auth Routes      ============
//=======================================================

authRoutes.get("/", controller.index); //serves non-resident admin login page

authRoutes.post("/login", controller.login); //checks if non-resident exists

authRoutes.get(
  "/user/dashboard/:id",
  checkUser,
  requireAuth,
  controller.userDashboard
); //serves non-resident dashboard

authRoutes.get("/logOut", checkUser, requireAuth, controller.logOut); //logs nonresident out

//========================================================
//============     Resident Auth Routes      =============
//========================================================

authRoutes.get("/resident", controller.residentIndex); //serves resident login page

authRoutes.post("/residentLogin", controller.residentLogin); //checks if resident exists

authRoutes.get(
  "/residentLogOut",
  checkResident,
  requireAuth,
  controller.residentLogOut
); //logs resident out

module.exports = authRoutes;
