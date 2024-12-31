const express = require("express");
const notificationRoutes = express.Router();
const controller = require("../controllers/notificationControllers");

//==================================
//    Medical Notifications
//==================================
notificationRoutes.post(
  "/request/medical/:residentID",
  controller.requestMedical
);

notificationRoutes.get(
  "/review/Medical/:residentID/:email",
  controller.reviewMedical
);

notificationRoutes.get(
  "/medical/approve/:residentID/:email",
  controller.approveMedical
);
notificationRoutes.get(
  "/medical/removeMedicalClearance/:residentID/:email",
  controller.removeMedicalClearance
);

notificationRoutes.get(
  "/medical/removeMedicalRestriction/:residentID/:email",
  controller.removeMedicalRestriction
);

notificationRoutes.get(
  "/medical/deny/:residentID/:email",
  controller.denyMedicalClearance
);

notificationRoutes.post(
  "/medical/saveMedicalNotes/:residentID/:email",
  controller.saveMedicalNotes
);

//=============================
//    All Notifications
//=============================

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
