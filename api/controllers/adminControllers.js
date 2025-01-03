const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");

module.exports = {
  //serves admin dashboard from admin portal
  async dashboard(req, res) {
    try {
      //finds residents who have not been reviewed for eligibility but have aproved resumes
      const residentsNeedReview = await Resident.find({
        isEligibleToWork: false,
        isRestrictedFromWork: false,
        resumeIsApproved: true,
      }).lean();

      const resumeNeedReview = await Resident.find({
        resumeIsComplete: true,
        resumeIsApproved: false,
      }).lean();

      res.render("admin/dashboard", {
        residentsNeedReview,
        resumeNeedReview,
        user: req.session.user,
      });
    } catch (err) {
      console.log(err);
    }
  },
  //serves help page from admin dashboard
  async helpDesk(req, res) {
    try {
      res.render("admin/helpDesk", { user: req.session.user });
    } catch (err) {
      console.log(err);
    }
  },

  //serves contact page from admin dashboard
  async contact(req, res) {
    try {
      res.render("admin/contact", { user: req.session.user });
    } catch (err) {
      console.log(err);
    }
  },

  //serves residentTables page from admin dashboard
  async residentTables(req, res) {
    try {
      const residents = await Resident.find().lean();
      res.render("admin/residentTables", { user: req.session.user, residents });
    } catch (err) {
      console.log(err);
    }
  },

  //serves unitTeamTables page from admin dashboard
  async unitTeamTables(req, res) {
    try {
      const unitTeam = await UnitTeam.find().lean();
      res.render("admin/unitTeamTables", { user: req.session.user, unitTeam });
    } catch (err) {
      console.log(err);
    }
  },

  //serves employerTables page from admin dashboard
  async employerTables(req, res) {
    try {
      const employers = await Employer.find().lean();
      res.render("admin/employerTables", { user: req.session.user, employers });
    } catch (err) {
      console.log(err);
    }
  },

  //==========================
  //   DB Routes
  //==========================
  //serves employerDB page from admin dashboard
  async employerDB(req, res) {
    try {
      res.render("admin/db/employerDB", { user: req.session.user });
    } catch (err) {
      console.log(err);
    }
  },

  //serves residentDB page from admin dashboard
  async residentDB(req, res) {
    try {
      res.render("admin/db/residentDB", { user: req.session.user });
    } catch (err) {
      console.log(err);
    }
  },

  //serves unitTeamDB page from admin dashboard
  async unitTeamDB(req, res) {
    try {
      res.render("admin/db/unitTeamDB", { user: req.session.user });
    } catch (err) {
      console.log(err);
    }
  },
};
