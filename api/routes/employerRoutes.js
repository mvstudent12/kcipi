const express = require("express");
const employerRoutes = express.Router();
const controller = require("../controllers/employerControllers");

//authentication middleware
const {
  requireAuth,
  checkUser,
  requireRole,
} = require("../middleware/authMiddleware");

employerRoutes.get(
  "/dashboard",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.dashboard
);

employerRoutes.get(
  "/reports",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.reports
);

employerRoutes.get(
  "/managePositions",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.managePositions
);
employerRoutes.post(
  "/searchPosition",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.searchPosition
);
employerRoutes.post(
  "/editSearchedPosition/:jobID",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.editSearchedPosition
);
employerRoutes.post(
  "/addNewPosition",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.addNewPosition
);

employerRoutes.get(
  "/jobProfile/:jobID",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.jobProfile
);

employerRoutes.post(
  "/editPosition/:jobID",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.editPosition
);

employerRoutes.post(
  "/deletePosition/:jobID",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.deletePosition
);

employerRoutes.get(
  "/manageWorkForce",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.manageWorkForce
);

employerRoutes.get(
  "/employees",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.employees
);

employerRoutes.get(
  "/contact",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.contact
);

employerRoutes.get(
  "/helpDesk",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.helpDesk
);

employerRoutes.get(
  "/cancelInterview/:interviewID",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.cancelInterview
);

module.exports = employerRoutes;
