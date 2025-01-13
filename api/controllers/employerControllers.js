const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Company = require("../models/Company");

module.exports = {
  //serves dashboard page for employers
  async dashboard(req, res) {
    try {
      res.render("employer/dashboard", { user: req.session.user });
    } catch (err) {
      console.log(err);
    }
  },
  //serves contact page for employers
  async contact(req, res) {
    try {
      res.render("employer/contact", { user: req.session.user });
    } catch (err) {
      console.log(err);
    }
  },
  //serves help desk page for employers
  async helpDesk(req, res) {
    try {
      res.render("employer/helpDesk", { user: req.session.user });
    } catch (err) {
      console.log(err);
    }
  },

  //serves managePositions page from employer dashboard
  async managePositions(req, res) {
    try {
      const companyName = req.session.user.company;
      console.log(companyName);
      const company = await Company.findOne({
        companyName: companyName,
      }).lean();
      console.log(company.jobs);
      res.render("employer/managePositions", {
        user: req.session.user,
        company,
      });
    } catch (err) {
      console.log(err);
    }
  },

  //adds new position to company db
  async addNewPosition(req, res) {
    try {
      const {
        position,
        description,
        pay,
        jobPool,
        companyName,
        availablePositions,
      } = req.body;

      await Company.updateOne(
        { companyName: companyName },
        {
          $push: {
            jobs: {
              position: position,
              description: description,
              pay: pay,
              jobPool: jobPool,
              availablePositions: availablePositions,
              isAvailable: true,
            },
          },
        }
      );
      const company = await Company.findOne({ company: companyName }).lean();

      res.render("employer/managePositions", {
        user: req.session.user,
        company,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async jobProfile(req, res) {
    try {
      const { id } = req.params;
      console.log(id);

      const findPosition = await Company.findOne(
        { "jobs._id": id },
        { "jobs.$": 1 }
      ).lean();
      const position = findPosition.jobs[0];
      const company = await Company.findOne({ "jobs._id": id }).lean();
      const activeTab = "overview";
      res.render("employer/jobProfile", {
        user: req.session.user,
        position,
        company,
        activeTab,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async editPosition(req, res) {
    try {
      const { id } = req.params;
      const {
        editPosition,
        description,
        pay,
        availablePositions,
        isAvailable,
        jobPool,
      } = req.body;

      await Company.findOneAndUpdate(
        { "jobs._id": id },
        {
          $set: {
            // Use the $ operator to update the specific job

            "jobs.$.position": editPosition,
            "jobs.$.description": description,
            "jobs.$.pay": pay,
            "jobs.$.availablePositions": availablePositions,
            "jobs.$.isAvailable": isAvailable,
            "jobs.$.jobPool": jobPool,
          },
        }
      );
      const findPosition = await Company.findOne(
        { "jobs._id": id },
        { "jobs.$": 1 }
      ).lean();
      const position = findPosition.jobs[0];
      const company = await Company.findOne({ "jobs._id": id }).lean();
      const activeTab = "edit";

      const saveMsg = true;
      res.render("employer/jobProfile", {
        user: req.session.user,
        position,
        company,
        activeTab,
        saveMsg,
      });
    } catch (err) {
      console.log(err);
    }
  },
};
