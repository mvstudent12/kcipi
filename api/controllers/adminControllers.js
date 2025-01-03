const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");

module.exports = {
  //serves admin dashboard from admin portal
  async dashboard(req, res) {
    try {
      const residents = await Resident.find().lean();

      res.render("admin/dashboard", { residents, user: req.session.user });
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
};
