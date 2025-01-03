const express = require("express");
const unitTeamRoutes = express.Router();
const controller = require("../controllers/unitTeamControllers");

//authentication middleware
const { requireAuth, checkUser } = require("../middleware/authMiddleware");

unitTeamRoutes.get("/dashboard", checkUser, requireAuth, controller.dashboard);

unitTeamRoutes.get("/helpDesk", checkUser, requireAuth, controller.helpDesk);

unitTeamRoutes.get("/contact", checkUser, requireAuth, controller.contact);

module.exports = unitTeamRoutes;
