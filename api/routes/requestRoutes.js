//Routes called from Email Link outside of app
//check security options in development ----> later
const express = require("express");
const requestRoutes = express.Router();
const controller = require("../controllers/requestControllers");

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
