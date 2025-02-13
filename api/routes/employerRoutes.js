const express = require("express");
const employerRoutes = express.Router();
const controller = require("../controllers/employerControllers");

//authentication middleware
const {
  requireAuth,
  checkUser,
  requireRole,
} = require("../middleware/authMiddleware");

  //=============================
  //   Employer Dashboard
  //=============================

employerRoutes.get(
  "/dashboard",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.dashboard
);

  //=============================
  //   Manage Positions
  //=============================

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
  //=============================
  //   Manage Workforce
  //=============================

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


  //=============================
  //   Resident Profile
  //=============================

employerRoutes.get(
  "/residentProfile/:residentID",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.residentProfile
);

employerRoutes.post(
  "/requestInterview/:jobID",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.requestInterview
);

employerRoutes.post(
  "/requestHire/:jobID/:res_id",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.requestHire
);

employerRoutes.post(
  "/requestTermination/:res_id",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.requestTermination
);

employerRoutes.get(
  "/rejectHire/:id/:jobID",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.rejectHire
);

  //=============================
  //   Reports
  //=============================

employerRoutes.get(
  "/reports",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.reports
);
employerRoutes.post(
  "/interviewReport",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.interviewReport
);

employerRoutes.post(
  "/employedResidentsReport",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.employedResidentsReport
);

employerRoutes.post(
  "/applicantsReport",
  checkUser,
  requireAuth,
  requireRole(["employer"]),
  controller.applicantsReport
);
  //=============================
  //   Basic Routes
  //=============================
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
module.exports = employerRoutes;
