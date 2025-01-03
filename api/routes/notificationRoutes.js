const express = require("express");
const notificationRoutes = express.Router();
const controller = require("../controllers/notificationControllers");

//============================
//Help Desk & Contact Notifications
//============================

notificationRoutes.post("/helpDesk", controller.helpDesk);

notificationRoutes.post("/contact", controller.contact);

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
//============================
//    Classification Notifications
//============================

notificationRoutes.get(
  "/Classification/approve/:residentID/:email",
  controller.approveClassification
);
notificationRoutes.get(
  "/Classification/removeClassificationClearance/:residentID/:email",
  controller.removeClassificationClearance
);

notificationRoutes.get(
  "/Classification/removeClassificationRestriction/:residentID/:email",
  controller.removeClassificationRestriction
);

notificationRoutes.get(
  "/Classification/deny/:residentID/:email",
  controller.denyClassificationClearance
);

notificationRoutes.post(
  "/Classification/saveClassificationNotes/:residentID/:email",
  controller.saveClassificationNotes
);
//============================
//    Warden Notifications
//============================

notificationRoutes.get(
  "/Warden/approve/:residentID/:email",
  controller.approveWarden
);
notificationRoutes.get(
  "/Warden/removeWardenClearance/:residentID/:email",
  controller.removeWardenClearance
);

notificationRoutes.get(
  "/Warden/removeWardenRestriction/:residentID/:email",
  controller.removeWardenRestriction
);

notificationRoutes.get(
  "/Warden/deny/:residentID/:email",
  controller.denyWardenClearance
);

notificationRoutes.post(
  "/Warden/saveWardenNotes/:residentID/:email",
  controller.saveWardenNotes
);
//=============================
//    All Notifications
//=============================
//request clearance from Medical, EAI, Classification, etc
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
