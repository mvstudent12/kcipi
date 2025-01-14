const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Company = require("../models/Company");
const Jobs = require("../models/Jobs");

const mongoose = require("mongoose");

module.exports = {
  //serves dashboard page for employers
  async dashboard(req, res) {
    try {
      const companyName = req.session.user.companyName;
      const company = await Company.findOne({
        companyName: companyName,
      }).lean();
      const companyID = company._id;

      const jobs = await Jobs.find({ companyID }).lean();

      // add total number of available job positions needed to fill
      if (jobs) {
        let positionsAvailable = jobs.length;
        // Calculate the total number of applicants
        let totalApplicants = jobs.reduce(
          (total, job) => total + job.applicants.length,
          0
        );
        // Flatten the applicants arrays from all jobs into one array of ObjectIds
        const applicantIds = jobs.flatMap((job) => job.applicants);

        // Query Resident model to find residents matching these IDs that applied to jobs
        const applicants = await Resident.find({
          _id: { $in: applicantIds },
        }).lean();

        res.render("employer/dashboard", {
          user: req.session.user,
          company,
          positionsAvailable,
          totalApplicants,
          applicants,
          jobs,
        });
      } else {
        let positionsAvailable = 0;
        let totalApplicants = 0;
        res.render("employer/dashboard", {
          user: req.session.user,
          company,
          positionsAvailable,
          totalApplicants,
          jobs,
        });
      }
    } catch (err) {
      console.log(err);
    }
  },

  //serves applicants page for employers
  async applicants(req, res) {
    try {
      const companyName = req.session.user.companyName;
      const company = await Company.findOne({
        companyName: companyName,
      }).lean();

      // Flatten the applicants arrays from all jobs into one array of ObjectIds
      const applicantIds = company.jobs.flatMap((job) => job.applicants);

      // Query Resident model to find residents matching these IDs that applied to jobs
      const applicants = await Resident.find({
        _id: { $in: applicantIds },
      }).lean();

      res.render("employer/applicants", { user: req.session.user, applicants });
    } catch (err) {
      console.log(err);
    }
  },
  //serves employees page for employers
  async employees(req, res) {
    try {
      res.render("employer/employees", { user: req.session.user });
    } catch (err) {
      console.log(err);
    }
  },
  //serves residentProfile page for employers
  async residentProfile(req, res) {
    try {
      const { residentID } = req.params;

      const resident = await Resident.findOne({ residentID }).lean();
      const id = resident._id;

      const jobApplications = resident.jobApplications;

      // Extract the position IDs from the array
      const positionIds = jobApplications.map(
        (item) => new mongoose.Types.ObjectId(item.position)
      );

      // Query the Jobs collection to get the position data
      const positions = await Jobs.find({
        _id: { $in: positionIds },
      }).lean();

      // Combine the position information with the original data
      const applications = jobApplications.map((item) => {
        // Find the corresponding position object by position ID
        const position = positions.find(
          (p) => p._id.toString() === item.position
        );

        // If a matching position is found, add it to the item
        if (position) {
          return {
            ...item,
            positionDetails: position, // Add the position details to the object
          };
        }

        return item; // Return the original item if no match is found
      });

      const activeTab = "overview";
      res.render("employer/residentProfile", {
        user: req.session.user,
        resident,
        activeTab,
        applications,
      });
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

  //=============================
  //     Manage Positions
  //=============================

  //serves managePositions page from employer dashboard
  async managePositions(req, res) {
    try {
      const companyName = req.session.user.companyName;
      const company = await Company.findOne({
        companyName: companyName,
      }).lean();
      const companyID = company._id;
      // Query jobs with the specified companyID
      const jobs = await Jobs.find({ companyID }).lean();

      console.log(jobs);

      res.render("employer/managePositions", {
        user: req.session.user,
        company,
        jobs,
      });
    } catch (err) {
      console.log(err);
    }
  },

  //adds new position to company db
  async addNewPosition(req, res) {
    try {
      const {
        companyID,
        companyName,
        position,
        description,
        pay,
        jobPool,
        availablePositions,
        facility,
      } = req.body;

      // Ensure `companyID` is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(companyID)) {
        console.log("Invalid company ID from managePositions Form");
        // return res.status(400).json({ error: "Invalid company ID" });
      }

      const newJob = await Jobs.create({
        companyID,
        companyName,
        position,
        description,
        pay,
        availablePositions: Number(availablePositions), // Ensure this is a number
        jobPool,
        facility,
      });
      console.log(newJob);

      const company = await Company.findOne({
        companyName: companyName,
      }).lean();
      const jobs = await Jobs.find({ companyID }).lean();
      const addPositionMSG = true;

      res.render("employer/managePositions", {
        user: req.session.user,
        company,
        addPositionMSG,
        jobs,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async jobProfile(req, res) {
    try {
      const { jobID } = req.params;

      const position = await Jobs.findById(jobID).lean();
      const companyID = position.companyID;
      const company = await Company.findById(companyID).lean();
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
      const { jobID } = req.params;
      const {
        editPosition,
        description,
        pay,
        availablePositions,
        isAvailable,
        facility,
        jobPool,
      } = req.body;
      console.log(req.body);
      await Jobs.findOneAndUpdate(
        { _id: jobID },
        {
          $set: {
            position: editPosition,
            description: description,
            pay: pay,
            availablePositions: availablePositions,
            isAvailable: isAvailable,
            facility: facility,
            jobPool: jobPool,
          },
        }
      );
      const position = await Jobs.findById(jobID).lean();
      const companyID = position.companyID;
      const company = await Company.findById(companyID).lean();
      const activeTab = "overview";

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
