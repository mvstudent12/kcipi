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
  "/jobProfile/:jobID",
  checkUser,
  requireAuth,
  controller.jobProfile
);

employerRoutes.post(
  "/editPosition/:jobID",
  checkUser,
  requireAuth,
  controller.editPosition
);

employerRoutes.post(
  "/deletePosition/:jobID",
  checkUser,
  requireAuth,
  controller.deletePosition
);

employerRoutes.get(
  "/applicants",
  checkUser,
  requireAuth,
  controller.applicants
);

employerRoutes.get("/employees", checkUser, requireAuth, controller.employees);

employerRoutes.get(
  "/residentProfile/:residentID",
  checkUser,
  requireAuth,
  controller.residentProfile
);

employerRoutes.get("/contact", checkUser, requireAuth, controller.contact);

employerRoutes.get("/helpDesk", checkUser, requireAuth, controller.helpDesk);

module.exports = employerRoutes;
