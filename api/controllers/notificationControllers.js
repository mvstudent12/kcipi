//database requests
const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");

const { sendReviewEmail } = require("../utils/sendEmailUtils");

module.exports = {
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
            medicalClearance: true,
            medicalClearanceDate: new Date(),
            medicallyClearedBy: email,
            medicallyReviewed: true,
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
            medicalClearance: false,
            medicalClearanceRemovedDate: new Date(),
            medicalClearanceRemovedBy: email,
            medicallyReviewed: false,
            medicalRestriction: false,
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
            medicalClearance: false,
            medicallyReviewed: false,
            medicalRestriction: false,
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
            medicalClearance: false,
            medicalRestrictionDate: new Date(),
            medicallyRestrictedBy: email,
            medicalRestriction: true,
            medicallyReviewed: true,
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
            medicalNotes: notes,
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
  //===========================
  //     All Notifications
  //===========================
  //request clearance from medical, eai etc through email
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
