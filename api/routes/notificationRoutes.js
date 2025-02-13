const express = require("express");
const notificationRoutes = express.Router();
const controller = require("../controllers/notificationControllers");

//authentication middleware
const { requireAuth, checkUser } = require("../middleware/authMiddleware");

notificationRoutes.get(
  "/reviewInterviewRequest/:interviewID",
  controller.reviewInterviewRequest
);

notificationRoutes.post(
  "/scheduleInterview/:interviewID/:jobID",
  controller.scheduleInterview
);

notificationRoutes.get(
  "/reviewHireRequest/:jobID/:res_id",
  controller.reviewHireRequest
);

notificationRoutes.get(
  "/reviewTerminationRequest/:res_id",
  controller.reviewTerminationRequest
);

//============================
//Help Desk & Contact Notifications
//============================
notificationRoutes.get("/thankYou", controller.thankYou);

notificationRoutes.post("/helpDesk", controller.helpDesk);

notificationRoutes.post("/contact", controller.contact);

//============================
//    Clearance Functions
//============================

notificationRoutes.get(
  "/approve/:residentID/:email/:dept",
  controller.approveClearance
);
notificationRoutes.get(
  "/restrict/:residentID/:email/:dept",
  controller.restrictClearance
);

notificationRoutes.post(
  "/saveNotes/:residentID/:email/:dept",
  controller.saveNotes
);

//=============================
//    All Notifications
//=============================
//request clearance from Medical, EAI, Classification, etc
notificationRoutes.post(
  "/requestClearance/:residentID/:dept",
  controller.requestClearance
);

notificationRoutes.get(
  "/reviewClearance/:dept/:residentID/:email",
  controller.reviewClearance
);

notificationRoutes.get(
  "/next_notes/:residentID/:email/:category",
  controller.next_notes
);
notificationRoutes.get(
  "/next_notify/:residentID/:email/:category",
  controller.next_notify
);
notificationRoutes.post(
  "/sendNextNotification/:residentID/:email",
  controller.sendNextNotification
);

module.exports = notificationRoutes;
