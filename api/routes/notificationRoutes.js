const express = require("express");
const notificationRoutes = express.Router();
const controller = require("../controllers/notificationControllers");

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
  "/medical/removeClearance/:residentID/:email",
  controller.removeClearance
);

notificationRoutes.get(
  "/medical/removeRestriction/:residentID/:email",
  controller.removeClearance
);

notificationRoutes.get(
  "/medical/deny/:residentID/:email",
  controller.denyMedical
);

notificationRoutes.post(
  "/medical/saveNotes/:residentID/:email",
  controller.saveNotes
);

notificationRoutes.post(
  "/medical/sendNextNotification/:residentID/:email",
  controller.sendNextNotification
);
notificationRoutes.get(
  "/medical/next_notes/:residentID/:email",
  controller.next_notes
);
notificationRoutes.get(
  "/medical/next_notify/:residentID/:email",
  controller.next_notify
);

module.exports = notificationRoutes;
