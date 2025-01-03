const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");

module.exports = {
  async dashboard(req, res) {
    try {
      res.render("unitTeam/dashboard", { user: req.session.user });
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
};
