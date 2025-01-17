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

        // Flatten the applicants arrays from all jobs into one array of ObjectIds
        const applicantIds = jobs.flatMap((job) => job.applicants);

        // Query Resident model to find residents matching these IDs that applied to jobs
        const applicants = await Resident.find({
          _id: { $in: applicantIds },
        }).lean();

        // Flatten the array of employees from all job documents
        const employeeIDs = jobs.flatMap((job) => job.employees);

        const allEmployees = await Resident.find({
          _id: { $in: employeeIDs },
        }).lean();

        res.render("employer/dashboard", {
          user: req.session.user,
          company,
          positionsAvailable,
          allEmployees,
          applicants,
          jobs,
        });
      } else {
        //if there are no current applicants
        let positionsAvailable = 0;
        let applicants = 0;
        res.render("employer/dashboard", {
          user: req.session.user,
          company,
          positionsAvailable,
          applicants,
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

      let applicantIDs;

      await Jobs.aggregate([
        { $match: { companyName: companyName } }, // Match Jobs with the specific company name
        { $unwind: "$applicants" }, // Flatten the applicants array
        { $group: { _id: null, allResidents: { $push: "$applicants" } } }, // Collect all resident IDs into an array
      ])
        .then((result) => {
          if (result.length > 0) {
            return (applicantIDs = result[0].allResidents);
          } else {
            console.log("No matching jobs found"); // No matching jobs found
            return (applicantIDs = []);
          }
        })
        .catch((err) => {
          console.error("Error fetching resident IDs:", err);
        });

      // Query Resident model to find residents matching these IDs that applied to jobs
      const applicants = await Resident.find({
        _id: { $in: applicantIDs },
      }).lean();

      res.render("employer/applicants", { user: req.session.user, applicants });
    } catch (err) {
      console.log(err);
    }
  },
  //serves employees page for employers
  async employees(req, res) {
    try {
      const companyName = req.session.user.companyName;
      const company = await Company.findOne({
        companyName: companyName,
      }).lean();
      const companyID = company._id;

      const jobs = await Jobs.find({ companyID }).lean();
      // Flatten the array of employees from all job documents
      const employeeIDs = jobs.flatMap((job) => job.employees);

      const allEmployees = await Resident.find({
        _id: { $in: employeeIDs },
      }).lean();

      res.render("employer/employees", {
        user: req.session.user,
        allEmployees,
      });
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

      //find positions resident has applied for
      const applications = await Jobs.find({
        applicants: { $in: [id] },
      }).lean();

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
  async scheduleInterview(req, res) {
    try {
      const { residentID } = req.body;

      const resident = await Resident.findOne({
        residentID: residentID,
      }).lean();

      const id = resident._id;

      const { jobID } = req.params;
      const interviewDetails = req.body;
      await Jobs.findByIdAndUpdate(jobID, {
        $push: {
          interviews: interviewDetails,
        },
      });
      //find positions resident has applied for
      const applications = await Jobs.find({
        applicants: { $in: [id] },
      }).lean();

      const activeTab = "application";
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
  async hireResident(req, res) {
    try {
      const { id, jobID } = req.params;

      await Resident.findByIdAndUpdate(id, {
        $set: {
          isHired: true,
        },
      });
      const resident = await Resident.findById(id).lean();
      const residentID = resident.residentID;

      //remove user from applicants/ interviews add to workforce
      await Jobs.findByIdAndUpdate(jobID, {
        $pull: {
          applicants: id,
          interviews: { residentID: residentID },
        },
        $push: {
          employees: id,
        },
        $inc: {
          availablePositions: -1, // Subtract 1 from availablePositions
        },
        set: {
          isAvailable: {
            $cond: {
              if: { $eq: ["$availablePositions", 0] },
              then: false,
              else: "$isAvailable",
            },
          },
        },
      });
      //remove resident from all other applied jobs
      await Jobs.updateMany(
        {}, // This empty filter matches all documents
        {
          $pull: {
            applicants: id, // Remove residentID from the applicants array
            interviews: { residentID: residentID }, // Remove interview with the given residentID
          },
        }
      );
      //find positions resident has applied for
      const applications = await Jobs.find({
        applicants: { $in: [id] },
      }).lean();

      const activeTab = "application";
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

  async terminateResident(req, res) {
    try {
      const { id } = req.params;

      await Resident.findByIdAndUpdate(id, {
        $set: {
          isHired: false,
        },
      });
      const resident = await Resident.findById(id).lean();

      const job = await Jobs.findOneAndUpdate(
        { employees: id }, // Find the job where id exists in employees
        { $pull: { employees: id } } // Remove the residentID from the employees array
      ).lean();
      console.log(job);
      //find positions resident has applied for
      const applications = await Jobs.find({
        applicants: { $in: [id] },
      }).lean();
      const activeTab = "application";
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
  //serves manageHiring page for employers
  async manageHiring(req, res) {
    try {
      res.render("employer/manageHiring", { user: req.session.user });
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
      const activeTab = "all";
      res.render("employer/managePositions", {
        user: req.session.user,
        company,
        jobs,
        activeTab,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async searchPosition(req, res) {
    try {
      const { jobID } = req.body;

      const companyName = req.session.user.companyName;
      const company = await Company.findOne({
        companyName: companyName,
      }).lean();
      const companyID = company._id;

      // Query jobs with the specified companyID
      const jobs = await Jobs.find({ companyID }).lean();

      //find searched position
      const positionFound = await Jobs.findById(jobID).lean();
      const activeTab = "edit";
      res.render("employer/managePositions", {
        user: req.session.user,
        company,
        jobs,
        positionFound,
        activeTab,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async editSearchedPosition(req, res) {
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
      // Query jobs with the specified companyID
      const jobs = await Jobs.find({ companyID }).lean();
      const activeTab = "all";

      const saveMsg = true;
      res.render("employer/managePositions", {
        user: req.session.user,
        position,
        company,
        jobs,
        activeTab,
        saveMsg,
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

      const company = await Company.findOne({
        companyName: companyName,
      }).lean();
      const jobs = await Jobs.find({ companyID }).lean();
      const addPositionMSG = true;

      const activeTab = "all";
      res.render("employer/managePositions", {
        user: req.session.user,
        company,
        addPositionMSG,
        jobs,
        activeTab,
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
      const applicantsArray = position.applicants;
      const applicants = await Resident.find({
        _id: { $in: applicantsArray },
      }).lean();

      const company = await Company.findById(companyID).lean();
      const activeTab = "overview";

      res.render("employer/jobProfile", {
        user: req.session.user,
        position,
        company,
        activeTab,
        applicants,
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
      const applicantsArray = position.applicants;
      const applicants = await Resident.find({
        _id: { $in: applicantsArray },
      }).lean();
      const company = await Company.findById(companyID).lean();
      const activeTab = "overview";

      const saveMsg = true;
      res.render("employer/jobProfile", {
        user: req.session.user,
        position,
        company,
        activeTab,
        saveMsg,
        applicants,
      });
    } catch (err) {
      console.log(err);
    }
  },
  //delete position
  async deletePosition(req, res) {
    const { jobID } = req.params;

    // Deleting position by ID
    Jobs.deleteOne({ _id: jobID })
      .then((result) => {
        console.log("Delete Result:", result);
      })
      .catch((error) => {
        console.error("Error deleting document:", error);
      });

    const companyName = req.session.user.companyName;
    const company = await Company.findOne({
      companyName: companyName,
    }).lean();
    const companyID = company._id;
    // Query jobs with the specified companyID
    const jobs = await Jobs.find({ companyID }).lean();
    const activeTab = "all";

    res.render("employer/managePositions", {
      user: req.session.user,
      company,
      jobs,
      activeTab,
    });
  },
};
