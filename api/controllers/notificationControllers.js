//database requests
const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");

const { sendReviewEmail } = require("../utils/sendEmailUtils");

module.exports = {
  async requestMedical(req, res) {
    const recipient = req.body.recipient;
    const notes = req.body.comments;
    const residentID = req.params.residentID;
    const sender = req.session.user.email;

    console.log(recipient);

    const resident = await Resident.findOne({ residentID }).lean();

    sendReviewEmail(resident, "medical", recipient, sender, notes);
    res.redirect(`/${req.session.user.role}/residentProfile/${residentID}`);
  },
  async reviewMedical(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    const resident = await Resident.findOne({ residentID }).lean();
    const activeTab = "status";
    res.render("clearance/medical", { resident, email, activeTab });
  },
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
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/medical", { resident, email });
  },
  async removeClearance(req, res) {
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
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/medical", { resident, email });
  },

  async denyMedical(req, res) {
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
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/medical", { resident, email });
  },
  async saveNotes(req, res) {
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
    res.render("clearance/medical", { resident, email, activeTab });
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
  async next_notes(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    const resident = await Resident.findOne({ residentID }).lean();
    const activeTab = "notes";
    res.render("clearance/medical", { resident, email, activeTab });
  },
  async next_notify(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    const resident = await Resident.findOne({ residentID }).lean();
    const activeTab = "notify";
    res.render("clearance/medical", { resident, email, activeTab });
  },
};