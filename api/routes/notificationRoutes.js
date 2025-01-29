const express = require("express");
const notificationRoutes = express.Router();
const controller = require("../controllers/notificationControllers");

notificationRoutes.post(
  "/requestInterview/:jobID/:email",
  controller.requestInterview
);

notificationRoutes.get(
  "/reviewInterviewRequest/:interviewID",
  controller.reviewInterviewRequest
);

notificationRoutes.post(
  "/scheduleInterview/:interviewID/:jobID",
  controller.scheduleInterview
);

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
//    UTM Notifications
//============================

notificationRoutes.get(
  "/UTM/approve/:residentID/:email",
  controller.approveUTM
);
notificationRoutes.get(
  "/UTM/removeUTMClearance/:residentID/:email",
  controller.removeUTMClearance
);

notificationRoutes.get(
  "/UTM/removeUTMRestriction/:residentID/:email",
  controller.removeUTMRestriction
);

notificationRoutes.get(
  "/UTM/deny/:residentID/:email",
  controller.denyUTMClearance
);

notificationRoutes.post(
  "/UTM/saveUTMNotes/:residentID/:email",
  controller.saveUTMNotes
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
notificationRoutes.get(
  "/Warden/removeWardenClearance/:residentID/:email",
  controller.removeWardenClearance
);
//============================
//    Sex-Offender Notifications
//============================

notificationRoutes.get(
  "/Sex-Offender/approve/:residentID/:email",
  controller.approveSexOffender
);

notificationRoutes.get(
  "/Sex-Offender/removeSex-OffenderRestriction/:residentID/:email",
  controller.removeSexOffenderRestriction
);

notificationRoutes.get(
  "/Sex-Offender/deny/:residentID/:email",
  controller.denySexOffenderClearance
);

notificationRoutes.post(
  "/Sex-Offender/saveSex-OffenderNotes/:residentID/:email",
  controller.saveSexOffenderNotes
);
notificationRoutes.get(
  "/Sex-Offender/removeSex-OffenderClearance/:residentID/:email",
  controller.removeSexOffenderClearance
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
