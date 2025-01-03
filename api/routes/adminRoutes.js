const express = require("express");
const adminRoutes = express.Router();
const controller = require("../controllers/adminControllers");

//authentication middleware
const { requireAuth, checkUser } = require("../middleware/authMiddleware");

adminRoutes.get("/dashboard", checkUser, requireAuth, controller.dashboard);

adminRoutes.get("/helpDesk", checkUser, requireAuth, controller.helpDesk);

adminRoutes.get("/contact", checkUser, requireAuth, controller.contact);

module.exports = adminRoutes;
