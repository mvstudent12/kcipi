const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");

module.exports = {
  async dashboard(req, res) {
    console.log(req.session.user.email);
    const email = req.session.user.email;
    try {
      const caseLoad = await Resident.find({
        "resume.unitTeam": email,
      }).lean();

      console.log(caseLoad);

      res.render("unitTeam/dashboard", {
        user: req.session.user,
        caseLoad,
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

  async residentTables(req, res) {
    try {
      console.log(req.session.user);
      const facility = req.session.user.facility;
      const residents = await Resident.find({ facility }).lean();
      res.render("unitTeam/residentTables", {
        user: req.session.user,
        residents,
      });
    } catch (err) {
      console.log(err);
    }
  },
};
