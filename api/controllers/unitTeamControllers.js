const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");

module.exports = {
  async dashboard(req, res) {
    try {
      const email = req.session.user.email;
      //find caseload specific to UTM
      const caseLoad = await Resident.find({
        "resume.unitTeam": email,
      }).lean();

      //make array of resident _id in caseload
      const residentIDs = caseLoad.flatMap((resident) => resident._id);

      let applicantIDs = [];

      //make array of applicant ids
      await Jobs.aggregate([
        { $unwind: "$applicants" }, // Flatten the applicants array
        { $match: { applicants: { $in: residentIDs } } }, // Filter applicants by residentID array
        { $group: { _id: null, allResidents: { $push: "$applicants" } } }, // Collect matching resident IDs
      ]).then((result) => {
        if (result.length > 0) {
          return (applicantIDs = result[0].allResidents);
        } else {
          return;
        }
      });
      //find all residents with applications in
      const applicants = await Resident.find(
        { _id: { $in: applicantIDs } },
        "firstName lastName facility residentID custodyLevel"
      ).lean();

      //find all residents who are actively hired
      const employees = await Resident.find({});

      res.render("unitTeam/dashboard", {
        user: req.session.user,
        caseLoad,
        applicants,
      });
    } catch (err) {
      console.log(err);
    }
  },

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
      res.render("unitTeam/profiles/residentProfile", {
        user: req.session.user,
        resident,
        activeTab,
        applications,
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
  async applicants(req, res) {
    try {
      const email = req.session.user.email;
      const caseLoad = await Resident.find({
        "resume.unitTeam": email,
      }).lean();

      //make array of resident _id in caseload
      const residentIDs = caseLoad.flatMap((resident) => resident._id);

      let applicantIDs = [];

      //make array of applicant ids
      await Jobs.aggregate([
        { $unwind: "$applicants" }, // Flatten the applicants array
        { $match: { applicants: { $in: residentIDs } } }, // Filter applicants by residentID array
        { $group: { _id: null, allResidents: { $push: "$applicants" } } }, // Collect matching resident IDs
      ]).then((result) => {
        if (result.length > 0) {
          return (applicantIDs = result[0].allResidents);
        } else {
          return;
        }
      });

      // Query Resident model to find residents matching these IDs that applied to jobs
      const applicants = await Resident.find({
        _id: { $in: applicantIDs },
      }).lean();

      res.render("unitTeam/applicants", { user: req.session.user, applicants });
    } catch (err) {
      console.log(err);
    }
  },
};
