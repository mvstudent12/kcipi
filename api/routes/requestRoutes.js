const express = require("express");
const requestRoutes = express.Router();
const controller = require("../controllers/requestControllers");

//authentication middleware
const { requireAuth, checkUser } = require("../middleware/authMiddleware");

requestRoutes.get(
  "/reviewInterviewRequest/:applicationID",
  controller.reviewInterviewRequest
);

requestRoutes.post(
  "/scheduleInterview/:interviewID/:jobID",
  controller.scheduleInterview
);

requestRoutes.get(
  "/reviewHireRequest/:applicationID",
  controller.reviewHireRequest
);

requestRoutes.get(
  "/reviewTerminationRequest/:res_id",
  controller.reviewTerminationRequest
);

//============================
//Help Desk & Contact Notifications
//============================
requestRoutes.get("/thankYou", controller.thankYou);

requestRoutes.post("/requestHelp", controller.requestHelp);

requestRoutes.post("/contact", controller.contact);

//============================
//    Clearance Functions
//============================

requestRoutes.get(
  "/approve/:residentID/:email/:dept",
  controller.approveClearance
);
requestRoutes.get(
  "/restrict/:residentID/:email/:dept",
  controller.restrictClearance
);

requestRoutes.post("/saveNotes/:residentID/:email/:dept", controller.saveNotes);

//=============================
//    All Notifications
//=============================
//request clearance from Medical, EAI, Classification, etc
requestRoutes.post(
  "/requestClearance/:residentID/:dept",
  controller.requestClearance
);

requestRoutes.get(
  "/reviewClearance/:dept/:residentID/:email",
  controller.reviewClearance
);

requestRoutes.get(
  "/next_notes/:residentID/:email/:dept",
  controller.next_notes
);
requestRoutes.get(
  "/next_notify/:residentID/:email/:dept",
  controller.next_notify
);
requestRoutes.post(
  "/sendNextNotification/:residentID/:email",
  controller.sendNextNotification
);

module.exports = requestRoutes;
