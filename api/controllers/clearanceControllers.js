const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");

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
      const resident = await Resident.findOne({ residentID }).lean();
      const id = resident._id;

      //find positions resident has applied for
      const applications = await Jobs.find({
        applicants: { $in: [id] },
      }).lean();

      const activeTab = "overview";
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        resident,
        user: req.session.user,
        activeTab,
        applications,
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

      res.render(`${req.session.user.role}/profiles/residentProfile`, {
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

      const saveMsg = "This resume has been approved.";
      const resident = await Resident.findOne({ residentID }).lean();
      const activeTab = "resume";

      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        resident,
        activeTab,
        user: req.session.user,
        saveMsg,
      });
    } catch (err) {
      console.error(err);
    }
  },
  async editClearance(req, res) {
    let { residentID, dept } = req.params;
    const { clearance, comments } = req.body;
    if (dept == "Sex-Offender") {
      dept = "sexOffender";
    }
    try {
      if (clearance === "true") {
        await Resident.updateOne(
          { residentID: residentID },
          {
            $set: {
              [`${dept}Reviewed`]: true,
              [`${dept}Clearance`]: true,
              [`${dept}ClearanceDate`]: new Date(),
              [`${dept}ClearedBy`]: req.session.user._id,
            },
            $push: {
              [`${dept}Notes`]: comments,
            },
          }
        );
      } else if (clearance === "false") {
        await Resident.updateOne(
          { residentID: residentID },
          {
            $set: {
              [`${dept}Reviewed`]: true,
              [`${dept}Clearance`]: false,
              [`${dept}ClearanceRemovedDate`]: new Date(),
              [`${dept}ClearanceRemovedBy`]: req.session.user._id,
              [`${dept}Restriction`]: true,
              [`${dept}RestrictionDate`]: new Date(),
              [`${dept}RestrictedBy`]: req.session.user._id,
            },
            $push: {
              [`${dept}Notes`]: comments,
            },
          }
        );
      }

      const resident = await Resident.findOne({ residentID }).lean();
      const activeTab = "clearance";

      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        resident,
        activeTab,
        user: req.session.user,
      });
    } catch (err) {
      console.error(err);
    }
  },
  async approveEligibility(req, res) {
    const { residentID } = req.params;
    const user = req.session.user._id;

    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            isEligibleToWork: true,
            eligibilityApprovedBy: req.session.user._id,
            isRestrictedFromWork: false,
          },
        }
      );
      const eligibleMsg = "This resident is approved and eligible for work.";
      const resident = await Resident.findOne({ residentID }).lean();
      const activeTab = "clearance";

      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        resident,
        activeTab,
        user: req.session.user,
        eligibleMsg,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async rejectEligibility(req, res) {
    const { residentID } = req.params;

    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            isEligibleToWork: false,
            isRestrictedFromWork: true,
            eligibilityRestrictedBy: req.session.user._id,
            eligibilityRestrictionReason: req.body.rejectReason,
          },
        }
      );

      const resident = await Resident.findOne({ residentID }).lean();

      const activeTab = "clearance";

      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        resident,
        activeTab,
        user: req.session.user,
      });
    } catch (err) {
      console.log(err);
    }
  },
};
