const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Company = require("../models/Company");
const Jobs = require("../models/Jobs");

const mongoose = require("mongoose");

// add total number of available job positions needed to fill
function getTotalAvailablePositions(jobsArray) {
  if (!Array.isArray(jobsArray)) {
    throw new Error("Input must be an array");
  }

  return jobsArray.reduce((total, job) => {
    if (typeof job.availablePositions === "number") {
      return total + job.availablePositions;
    }
    return total; // Skip if availablePositions is not a number
  }, 0);
}

//find jobs in company
const findJobs = async (companyName) => {
  //find company by name
  const company = await Company.findOne({
    companyName: companyName,
  }).lean();

  //declare companyID
  const companyID = company._id;

  //find jobs with companyID
  const jobs = await Jobs.find({ companyID }).lean();
  return jobs;
};

module.exports = {
  //serves dashboard page for employers
  async dashboard(req, res) {
    try {
      //declare companyName
      const companyName = req.session.user.companyName;
      const jobs = await findJobs(companyName);
      //check if jobs exist
      if (jobs) {
        let positionsAvailable = getTotalAvailablePositions(jobs);

        // Flatten the applicants arrays from all jobs into one array of ObjectIds
        const applicantIds = jobs.flatMap((job) => job.applicants);

        // Query Resident model to find residents matching these IDs that applied to jobs
        const applicants = await Resident.find({
          _id: { $in: applicantIds },
        }).lean();

        // Flatten the array of employees from all job documents
        const employeeIDs = jobs.flatMap((job) => job.employees);

        //find all employees at this company
        const employees = await Resident.find({
          _id: { $in: employeeIDs },
        }).lean();

        res.render("employer/dashboard", {
          user: req.session.user,
          positionsAvailable,
          employees,
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

  //=============================
  //     Manage Pages
  //=============================
  //serves manageWorkForce page for employers
  async manageWorkForce(req, res) {
    try {
      const companyName = req.session.user.companyName;
      let applicantIDs;

      //find all resident IDs who have applied for jobs in caseload
      await Jobs.aggregate([
        { $match: { companyName: companyName } },
        { $unwind: "$applicants" },
        { $group: { _id: null, allResidents: { $push: "$applicants" } } }, // Collect all resident IDs into an array
      ])
        .then((result) => {
          if (result.length > 0) {
            return (applicantIDs = result[0].allResidents);
          } else {
            console.log("No matching jobs found");
            return (applicantIDs = []);
          }
        })
        .catch((err) => {
          console.error("Error fetching resident IDs:", err);
        });

      // Query Resident model to find residents matching these IDs that applied to jobs
      const applicants = await Resident.find(
        {
          _id: { $in: applicantIDs },
        },
        {
          _id: 0,
          residentID: 1, // Include residentID
          firstName: 1, // Include name
          lastName: 1,
          outDate: 1, // Include outDate
          custodyLevel: 1, // Include custodyLevel
          facility: 1, // Include facility
        }
      ).lean();

      const findInterviews = await Jobs.aggregate([
        // Match jobs by the specific companyName
        { $match: { companyName: companyName.toLowerCase() } },

        // Project only the interviews field along with the job ID or other context fields if needed
        {
          $project: {
            _id: 0, // Exclude the default `_id` field (optional)
            interviews: 1, // Include the interviews field
            position: 1,
          },
        },

        // Unwind the interviews array to process each interview individually
        { $unwind: "$interviews" },

        // Optionally format the output to include interview details with additional context (e.g., job ID)
        {
          $group: {
            _id: null, // Group all interviews into one object (no specific grouping criteria)
            allInterviews: {
              $push: {
                interview: "$interviews",
                position: "$position",
              },
            },
          },
        },
      ]);

      let interviews = [];
      if (findInterviews.length) {
        interviews = findInterviews[0].allInterviews;
      }

      const jobs = await findJobs(companyName);
      // Flatten the array of employees from all job documents
      const employeeIDs = jobs.flatMap((job) => job.employees);

      //find all employees at this company
      const employees = await Resident.find(
        {
          _id: { $in: employeeIDs },
        },
        {
          _id: 0,
          residentID: 1,
          firstName: 1,
          lastName: 1,
          outDate: 1,
          custodyLevel: 1,
          facility: 1,
          unitTeam: 1,
          dateHired: 1,
        }
      ).lean();

      res.render("employer/manageWorkForce", {
        user: req.session.user,
        applicants,
        interviews,
        employees,
      });
    } catch (err) {
      console.log(err);
    }
  },

  //cancel interview with resident
  async cancelInterview(req, res) {
    try {
      const { interviewID } = req.params;
      //delete interview from jobs
      await Jobs.updateOne(
        { "interviews._id": interviewID }, // Match the job by its ID
        { $pull: { interviews: { _id: interviewID } } } // Remove the interview with the specific _id
      );
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

      const findInterviews = await Jobs.aggregate([
        // Match jobs by the specific companyName
        { $match: { companyName: companyName.toLowerCase() } },

        // Project only the interviews field along with the job ID or other context fields if needed
        {
          $project: {
            _id: 0, // Exclude the default `_id` field (optional)
            interviews: 1, // Include the interviews field
          },
        },

        // Unwind the interviews array to process each interview individually
        { $unwind: "$interviews" },

        // Optionally format the output to include interview details with additional context (e.g., job ID)
        {
          $group: {
            _id: null, // Group all interviews into one object (no specific grouping criteria)
            allInterviews: { $push: "$interviews" },
          },
        },
      ]);
      let interviews = [];
      if (findInterviews.length) {
        interviews = findInterviews[0].allInterviews;
      }

      res.render("employer/manageWorkForce", {
        user: req.session.user,
        applicants,
        interviews,
      });
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
  //find position to edit
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
  //edits found position
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
  //serves job profile info for specific job
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

      res.render("employer/profiles/jobProfile", {
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
  //edits position on jobProfile
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
      res.render("employer/profiles/jobProfile", {
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
  //=============================
  //     Manage Workforce
  //=============================

  //=============================
  //     Basic Routes
  //=============================
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
};
