//Routes called from Email Link outside of app
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
// Email Clearance Functions
//============================

requestRoutes.get(
  "/reviewClearance/:deptName/:residentID/:email",
  controller.reviewClearance
);

requestRoutes.get(
  "/approve/:residentID/:email/:deptName",
  controller.approveClearance
);
requestRoutes.get(
  "/restrict/:residentID/:email/:deptName",
  controller.restrictClearance
);

requestRoutes.post(
  "/saveNotes/:residentID/:email/:deptName",
  controller.saveNotes
);

requestRoutes.get(
  "/next/:residentID/:email/:deptName/:activeTab",
  controller.next
);

requestRoutes.post(
  "/sendNextNotification/:residentID/:email",
  controller.sendNextNotification
);

module.exports = requestRoutes;
