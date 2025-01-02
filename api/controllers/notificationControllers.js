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
  async removeEAIClearance(req, res) {
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
  async removeEAIRestriction(req, res) {
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

  async denyEAIClearance(req, res) {
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
  async saveEAINotes(req, res) {
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
  //===========================
  //     All Notifications
  //===========================
  //request clearance from medical, eai etc through email
  async requestClearance(req, res) {
    const recipient = req.body.recipient;
    const notes = req.body.comments;
    const residentID = req.params.residentID;
    const sender = req.session.user.email;
    const category = req.params.category;

    try {
      const resident = await Resident.findOne({ residentID }).lean();
      sendReviewEmail(resident, category, recipient, sender, notes);
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
    console.log(req.params);

    const { residentID, email, dept } = req.params;
    const resident = await Resident.findOne({ residentID }).lean();
    const activeTab = "status";
    res.render(`clearance/${dept}`, { resident, email, activeTab });
  },
  async next_notes(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    const category = req.params.category;
    const resident = await Resident.findOne({ residentID }).lean();
    const activeTab = "notes";
    res.render(`clearance/${category}`, { resident, email, activeTab });
  },
  async next_notify(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    const category = req.params.category;
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
