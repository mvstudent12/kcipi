const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");

module.exports = {
  //serves non-resident dashboard from login portal portal
  async dashboard(req, res) {
    try {
      const residents = await Resident.find().lean();

      res.render(`${req.session.user.role}/dashboard`, {
        residents,
        user: req.session.user,
      });
    } catch (err) {
      console.log(err);
    }
  },
  //serves resident profile with their resume
  async residentProfile(req, res) {
    try {
      const residentID = req.params.id;
      const resident = await Resident.findOne({
        residentID: residentID,
      }).lean();
      const activeTab = "overview";
      res.render(`${req.session.user.role}/residentProfile`, {
        resident,
        user: req.session.user,
        activeTab,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async rejectResume(req, res) {
    const residentID = req.params.id;
    const rejectReason = req.body.rejectReason;

    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            resumeIsApproved: false,
            resumeIsComplete: false,
            resumeRejectionReason: rejectReason,
          },
        }
      );
      const resident = await Resident.findOne({ residentID }).lean();
      const activeTab = "resume";

      res.render(`${req.session.user.role}/residentProfile`, {
        resident,
        activeTab,
        user: req.session.user,
      });
    } catch (err) {
      console.error(err);
    }
  },
  async approveResume(req, res) {
    const residentID = req.params.id;
    const jobPool = req.body.jobPool;
    console.log(req.body);
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            resumeIsApproved: true,
            jobPool: jobPool,
          },
        }
      );

      const saveMsg = "Resume Approved.";
      const resident = await Resident.findOne({ residentID }).lean();
      const activeTab = "resume";

      res.render(`${req.session.user.role}/residentProfile`, {
        resident,
        activeTab,
        user: req.session.user,
        saveMsg,
      });
    } catch (err) {
      console.error(err);
    }
  },

  async approveEligibility(req, res) {
    console.log(req.params);
    console.log(req.body);
  },
};
