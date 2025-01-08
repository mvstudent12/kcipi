//database requests
const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");

const {
  sendReviewEmail,
  sendHelpDeskEmail,
  sendContactEmail,
} = require("../emailUtils/notificationEmail");

module.exports = {
  //========================
  //   Help Desk
  //========================
  async helpDesk(req, res) {
    const { name, email, subject, message } = req.body;
    const recipient = "kcicodingdev@gmail.com";
    try {
      sendHelpDeskEmail(name, subject, email, message, recipient);
      const sentMsg = true;
      res.render(`${req.session.user.role}/helpDesk`, {
        user: req.session.user,
        sentMsg,
      });
    } catch (err) {
      console.log(err);
    }
  },
  //========================
  //   Contact
  //========================
  async contact(req, res) {
    const { name, email, subject, message } = req.body;
    const recipient = "kcicodingdev@gmail.com";
    try {
      sendContactEmail(name, subject, email, message, recipient);
      const sentMsg = true;
      res.render(`${req.session.user.role}/contact`, {
        user: req.session.user,
        sentMsg,
      });
    } catch (err) {
      console.log(err);
    }
  },

  //========================
  //   Medical Clearance
  //========================

  async approveMedical(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            MedicalClearance: true,
            MedicalClearanceDate: new Date(),
            MedicalClearedBy: email,
            MedicalReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    console.log(resident);
    res.render("clearance/Medical", { resident, email, activeTab });
  },
  async removeMedicalClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            MedicalClearance: false,
            MedicalClearanceRemovedDate: new Date(),
            MedicalClearanceRemovedBy: email,
            MedicalReviewed: false,
            MedicalRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Medical", { resident, email, activeTab });
  },
  async removeMedicalRestriction(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            MedicalClearance: false,
            MedicalReviewed: false,
            MedicalRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Medical", { resident, email, activeTab });
  },

  async denyMedicalClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            MedicalClearance: false,
            MedicalRestrictionDate: new Date(),
            MedicalRestrictedBy: email,
            MedicalRestriction: true,
            MedicalReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Medical", { resident, email, activeTab });
  },
  async saveMedicalNotes(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    const notes = req.body.notes;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $push: {
            MedicalNotes: notes,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    const activeTab = "notes";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Medical", { resident, email, activeTab });
  },
  //========================
  //   UTM Clearance
  //========================

  async approveUTM(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            UTMClearance: true,
            UTMClearanceDate: new Date(),
            UTMClearedBy: email,
            UTMReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    console.log(resident);
    res.render("clearance/UTM", { resident, email, activeTab });
  },
  async removeUTMClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            UTMClearance: false,
            UTMClearanceRemovedDate: new Date(),
            UTMClearanceRemovedBy: email,
            UTMReviewed: false,
            UTMRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/UTM", { resident, email, activeTab });
  },
  async removeUTMRestriction(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            UTMClearance: false,
            UTMReviewed: false,
            UTMRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/UTM", { resident, email, activeTab });
  },

  async denyUTMClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            UTMClearance: false,
            UTMRestrictionDate: new Date(),
            UTMRestrictedBy: email,
            UTMRestriction: true,
            UTMReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/UTM", { resident, email, activeTab });
  },
  async saveUTMNotes(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    const notes = req.body.notes;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $push: {
            UTMNotes: notes,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    const activeTab = "notes";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/UTM", { resident, email, activeTab });
  },
  //========================
  //   EAI Clearance
  //========================

  async approveEAI(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            EAIClearance: true,
            EAIClearanceDate: new Date(),
            EAIClearedBy: email,
            EAIReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/EAI", { resident, email, activeTab });
  },
  async removeEAIClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            EAIClearance: false,
            EAIClearanceRemovedDate: new Date(),
            EAIClearanceRemovedBy: email,
            EAIReviewed: false,
            EAIRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/EAI", { resident, email, activeTab });
  },
  async removeEAIRestriction(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            EAIClearance: false,
            EAIReviewed: false,
            EAIRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/EAI", { resident, email, activeTab });
  },

  async denyEAIClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            EAIClearance: false,
            EAIRestrictionDate: new Date(),
            EAIRestrictedBy: email,
            EAIRestriction: true,
            EAIReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/EAI", { resident, email, activeTab });
  },
  async saveEAINotes(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    const notes = req.body.notes;

    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $push: {
            EAINotes: notes,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    const activeTab = "notes";
    const resident = await Resident.findOne({ residentID }).lean();
    console.log(resident);
    res.render("clearance/EAI", { resident, email, activeTab });
  },
  //========================
  //   Classification Clearance
  //========================

  async approveClassification(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            ClassificationClearance: true,
            ClassificationClearanceDate: new Date(),
            ClassificationClearedBy: email,
            ClassificationReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Classification", { resident, email, activeTab });
  },
  async removeClassificationClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            ClassificationClearance: false,
            ClassificationClearanceRemovedDate: new Date(),
            ClassificationClearanceRemovedBy: email,
            ClassificationReviewed: false,
            ClassificationRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Classification", { resident, email, activeTab });
  },
  async removeClassificationRestriction(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            ClassificationClearance: false,
            ClassificationReviewed: false,
            ClassificationRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Classification", { resident, email, activeTab });
  },

  async denyClassificationClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            ClassificationClearance: false,
            ClassificationRestrictionDate: new Date(),
            ClassificationRestrictedBy: email,
            ClassificationRestriction: true,
            ClassificationReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Classification", { resident, email, activeTab });
  },
  async saveClassificationNotes(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    const notes = req.body.notes;

    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $push: {
            ClassificationNotes: notes,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    const activeTab = "notes";
    const resident = await Resident.findOne({ residentID }).lean();
    console.log(resident);
    res.render("clearance/Classification", { resident, email, activeTab });
  },
  //========================
  //   Warden Clearance
  //========================

  async approveWarden(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            WardenClearance: true,
            WardenClearanceDate: new Date(),
            WardenClearedBy: email,
            WardenReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Warden", { resident, email, activeTab });
  },
  async removeWardenClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            WardenClearance: false,
            WardenClearanceRemovedDate: new Date(),
            WardenClearanceRemovedBy: email,
            WardenReviewed: false,
            WardenRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Warden", { resident, email, activeTab });
  },
  async removeWardenRestriction(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            WardenClearance: false,
            WardenReviewed: false,
            WardenRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Warden", { resident, email, activeTab });
  },

  async denyWardenClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            WardenClearance: false,
            WardenRestrictionDate: new Date(),
            WardenRestrictedBy: email,
            WardenRestriction: true,
            WardenReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Warden", { resident, email, activeTab });
  },
  async saveWardenNotes(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    const notes = req.body.notes;

    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $push: {
            WardenNotes: notes,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    const activeTab = "notes";
    const resident = await Resident.findOne({ residentID }).lean();
    console.log(resident);
    res.render("clearance/Warden", { resident, email, activeTab });
  },

  //========================
  //   Sex-Offender Clearance
  //========================

  async approveSexOffender(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            sexOffenderClearance: true,
            sexOffenderClearanceDate: new Date(),
            sexOffenderClearedBy: email,
            sexOffenderReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Sex-Offender", { resident, email, activeTab });
  },
  async removeSexOffenderClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            sexOffenderClearance: false,
            sexOffenderClearanceRemovedDate: new Date(),
            sexOffenderClearanceRemovedBy: email,
            sexOffenderReviewed: false,
            sexOffenderRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Sex-Offender", { resident, email, activeTab });
  },
  async removeSexOffenderRestriction(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            sexOffenderClearance: false,
            sexOffenderReviewed: false,
            sexOffenderRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Sex-Offender", { resident, email, activeTab });
  },

  async denySexOffenderClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            sexOffenderClearance: false,
            sexOffenderRestrictionDate: new Date(),
            sexOffenderRestrictedBy: email,
            sexOffenderRestriction: true,
            sexOffenderReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Sex-Offender", { resident, email, activeTab });
  },
  async saveSexOffenderNotes(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    const notes = req.body.notes;

    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $push: {
            sexOffenderNotes: notes,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    const activeTab = "notes";
    const resident = await Resident.findOne({ residentID }).lean();
    console.log(resident);
    res.render("clearance/Sex-Offender", { resident, email, activeTab });
  },
  //===========================
  //     All Notifications
  //===========================
  //request clearance from Medical, eai etc through email
  async requestClearance(req, res) {
    const { recipient, comments } = req.body;
    const { residentID, category } = req.params;
    const sender = req.session.user.email;

    try {
      const resident = await Resident.findOne({ residentID }).lean();
      sendReviewEmail(resident, category, recipient, sender, comments);
      res.status(200).json({ message: "Request Sent" });
    } catch (err) {
      console.log(errors);
      //add more elegant error handling functionality later
      //add const errors = handleErrors(err);
      //res.status(400).json({ errors });
      res.status(400).json({ message: "Request Failed" });
    }
  },
  async reviewClearance(req, res) {
    const { residentID, email, dept } = req.params;
    const resident = await Resident.findOne({ residentID }).lean();
    const activeTab = "status";
    console.log("ROUTED OKAY");
    console.log(dept);
    res.render(`clearance/${dept}`, { resident, email, activeTab });
  },
  async next_notes(req, res) {
    const { residentID, email, category } = req.params;

    const resident = await Resident.findOne({ residentID }).lean();
    const activeTab = "notes";
    res.render(`clearance/${category}`, { resident, email, activeTab });
  },
  async next_notify(req, res) {
    const { residentID, email, category } = req.params;
    const resident = await Resident.findOne({ residentID }).lean();
    const activeTab = "notify";
    res.render(`clearance/${category}`, { resident, email, activeTab });
  },

  async sendNextNotification(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    const department = req.body.category;
    const recipient = req.body.recipientEmail;
    const notes = req.body.comments;
    const resident = await Resident.findOne({ residentID }).lean();

    sendReviewEmail(resident, department, recipient, email, notes);
    res.render("clearance/thankYou", { resident, email });
  },
};
