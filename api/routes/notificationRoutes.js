const express = require("express");
const notificationRoutes = express.Router();
const controller = require("../controllers/notificationControllers");

//============================
//    Medical Notifications
//============================

notificationRoutes.get(
  "/Medical/approve/:residentID/:email",
  controller.approveMedical
);
notificationRoutes.get(
  "/Medical/removeMedicalClearance/:residentID/:email",
  controller.removeMedicalClearance
);

notificationRoutes.get(
  "/Medical/removeMedicalRestriction/:residentID/:email",
  controller.removeMedicalRestriction
);

notificationRoutes.get(
  "/Medical/deny/:residentID/:email",
  controller.denyMedicalClearance
);

notificationRoutes.post(
  "/Medical/saveMedicalNotes/:residentID/:email",
  controller.saveMedicalNotes
);
//============================
//    EAI Notifications
//============================

notificationRoutes.get(
  "/EAI/approve/:residentID/:email",
  controller.approveEAI
);
notificationRoutes.get(
  "/EAI/removeEAIClearance/:residentID/:email",
  controller.removeEAIClearance
);

notificationRoutes.get(
  "/EAI/removeEAIRestriction/:residentID/:email",
  controller.removeEAIRestriction
);

notificationRoutes.get(
  "/EAI/deny/:residentID/:email",
  controller.denyEAIClearance
);

notificationRoutes.post(
  "/EAI/saveEAINotes/:residentID/:email",
  controller.saveEAINotes
);

//=============================
//    All Notifications
//=============================
//request clearance from Medical, EAI, classifications, etc
notificationRoutes.post(
  "/requestClearance/:residentID/:category",
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
