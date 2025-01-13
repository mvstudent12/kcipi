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

employerRoutes.post(
  "/addNewPosition",
  checkUser,
  requireAuth,
  controller.addNewPosition
);

employerRoutes.get(
  "/jobProfile/:id",
  checkUser,
  requireAuth,
  controller.jobProfile
);

employerRoutes.post(
  "/editPosition/:id",
  checkUser,
  requireAuth,
  controller.editPosition
);

employerRoutes.get("/contact", checkUser, requireAuth, controller.contact);

employerRoutes.get("/helpDesk", checkUser, requireAuth, controller.helpDesk);

module.exports = employerRoutes;
