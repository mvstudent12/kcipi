const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");

module.exports = {
  //serves dashboard page for employers
  async dashboard(req, res) {
    try {
      res.render("employer/dashboard", { user: req.session.user });
    } catch (err) {
      console.log(err);
    }
  },

  //serves managePositions page from employer dashboard
  async managePositions(req, res) {
    try {
      res.render("employer/managePositions", { user: req.session.user });
    } catch (err) {
      console.log(err);
    }
  },
};
