const express = require("express");
const adminRoutes = express.Router();
const controller = require("../controllers/adminControllers");

//authentication middleware
const { requireAuth, checkUser } = require("../middleware/authMiddleware");

adminRoutes.get("/dashboard", checkUser, requireAuth, controller.dashboard);

adminRoutes.get(
  "/residentProfile/:id",
  checkUser,
  requireAuth,
  controller.residentProfile
);

module.exports = adminRoutes;
