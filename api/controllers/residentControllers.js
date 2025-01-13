const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");

module.exports = {
  async dashboard(req, res) {
    try {
      res.render("resident/dashboard", { user: req.session.resident });
    } catch (err) {
      console.log(err);
    }
  },

  async profile(req, res) {
    try {
      //if resident has not completed a resume or has a resume rejected
      if (
        !req.session.resident.resumeIsComplete ||
        !req.session.resident.resumeRejectionReason
      ) {
        const unitTeam = await UnitTeam.find({
          facility: req.session.resident.facility,
        }).lean();
        res.render("resident/profile", {
          unitTeam,
          user: req.session.resident,
        });
      }
    } catch (err) {
      console.log(err);
    }
  },
  async saveResume(req, res) {
    const email = req.body.unitTeam;
    const id = req.session.resident._id.toString();
    try {
      //if resident is completing a resume for the first time
      if (email) {
        const unitTeam = await UnitTeam.findOne({ email }).lean();
        await Resident.updateOne(
          { _id: id },
          {
            $set: {
              resumeIsComplete: true,
              resume: req.body,
              unitTeam: unitTeam.lastName,
            },
          }
        );
      } else {
        //if resident is correcting a rejected resume
        await Resident.updateOne(
          { _id: id },
          {
            $set: {
              resumeIsComplete: true,
              resume: req.body,
              resumeRejectionReason: "",
            },
          }
        );
      }

      let resident = await Resident.findOne({ _id: id }).lean();
      req.session.resident = resident;
      res.render("resident/profile", { user: req.session.resident });
    } catch (err) {
      console.log(err);
    }
  },
  async applications(req, res) {
    try {
      res.render("resident/applications", { user: req.session.resident });
    } catch (err) {
      console.log(err);
    }
  },
  async faq(req, res) {
    try {
      res.render("resident/faq", { user: req.session.resident });
    } catch (err) {
      console.log(err);
    }
  },
  async jobInfo(req, res) {
    try {
      res.render("resident/jobInfo", { user: req.session.resident });
    } catch (err) {
      console.log(err);
    }
  },
};
