const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");

module.exports = {
  async dashboard(req, res) {
    try {
      const email = req.session.user.email;
      const caseLoad = await Resident.find({
        "resume.unitTeam": email,
      }).lean();

      // Access all job applications across all residents
      const allJobApplications = caseLoad.flatMap(
        (resident) => resident.jobApplications
      );

      res.render("unitTeam/dashboard", {
        user: req.session.user,
        caseLoad,
        allJobApplications,
      });
    } catch (err) {
      console.log(err);
    }
  },

  async helpDesk(req, res) {
    try {
      res.render("unitTeam/helpDesk", { user: req.session.user });
    } catch (err) {
      console.log(err);
    }
  },

  async contact(req, res) {
    try {
      res.render("unitTeam/contact", { user: req.session.user });
    } catch (err) {
      console.log(err);
    }
  },
  async residentProfile(req, res) {
    try {
      const residentID = req.params.id;
      const resident = await Resident.findOne({ residentID }).lean();
      const activeTab = "overview";
      res.render("unitTeam/profiles/residentProfile", {
        user: req.session.user,
        resident,
        activeTab,
      });
    } catch (err) {
      console.log(err);
    }
  },

  async residentTables(req, res) {
    try {
      const facility = req.session.user.facility;
      const residents = await Resident.find({ facility }).lean();
      res.render("unitTeam/tables/residentTables", {
        user: req.session.user,
        residents,
      });
    } catch (err) {
      console.log(err);
    }
  },
};
