const express = require("express");
const employerRoutes = express.Router();
const controller = require("../controllers/employerControllers");

//authentication middleware
const { requireAuth, checkUser } = require("../middleware/authMiddleware");

employerRoutes.get("/dashboard", checkUser, requireAuth, controller.dashboard);

employerRoutes.get(
  "/managePositions",
  checkUser,
  requireAuth,
  controller.managePositions
);

employerRoutes.get(
  "/addNewPosition",
  checkUser,
  requireAuth,
  controller.addNewPosition
);

module.exports = employerRoutes;
