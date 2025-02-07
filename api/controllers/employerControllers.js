const Admin = require("../models/Admin");
const Facility_Management = require("../models/Facility_Management");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Company = require("../models/Company");
const Jobs = require("../models/Jobs");

const {
  sendReviewEmail,
  sendHelpDeskEmail,
  sendContactEmail,
  sendRequestInterviewEmail,
  sendRequestHireEmail,
} = require("../utils/emailUtils/notificationEmail");

const mongoose = require("mongoose");

const logger = require("../utils/logger");
//=============================
//     Helper Functions
//=============================

// add total number of available job positions needed to fill
function getTotalAvailablePositions(jobsArray) {
  if (!Array.isArray(jobsArray)) {
    throw new Error("Input must be an array");
  }

  return jobsArray.reduce((total, job) => {
    // Ensure job has availablePositions and it's a valid number
    if (job && typeof job.availablePositions === "number") {
      return total + job.availablePositions;
    }
    return total; // Skip invalid or missing availablePositions
  }, 0);
}

//find jobs in company
const findJobs = async (companyName) => {
  //find company by name to get the _id value
  const company = await Company.findOne({
    companyName: companyName,
  }).lean();

  //declare companyID
  const companyID = company._id;

  //find jobs with companyID
  const jobs = await Jobs.find({ companyID }).lean();
  return jobs;
};

const findCompanyID = async (companyName) => {
  try {
    const company = await Company.findOne({ companyName }).lean();

    // If company isn't found, throw an error
    if (!company) {
      throw new Error(`Company with name "${companyName}" not found.`);
    }

    return company._id; // Return company ID if found
  } catch (err) {
    console.error("Error finding company:", err.message);
    throw new Error("An error occurred while retrieving the company ID.");
  }
};

const findResident = async (residentID) => {
  try {
    const resident = await Resident.findOne({ residentID }).lean();

    // If the resident isn't found, throw a custom error
    if (!resident) {
      throw new Error(`Resident with ID ${residentID} not found.`);
    }

    return resident;
  } catch (err) {
    console.error("Error finding resident:", err.message);
    throw new Error("An error occurred while retrieving the resident.");
  }
};

const getResidentApplications = async (companyID, residentID) => {
  try {
    const jobs = await Jobs.find(
      { companyID, "applicants.resident_id": residentID }, // Find jobs where the resident applied
      {
        "applicants.$": 1,
        companyName: 1,
        position: 1,
        pay: 1,
        interviews: 1,
      } // Return only the matching applicants and job details
    ).lean();

    return jobs;
  } catch (error) {
    console.error("Error fetching resident applications:", error);
    throw error;
  }
};

module.exports = {
  //=============================
  //     Basic Routes
  //=============================
  //serves dashboard page for employers
  async dashboard(req, res) {
    try {
      const companyName = req.session.user.companyName;
      const jobs = await findJobs(companyName);
      //check if jobs exist for this company
      if (jobs) {
        let positionsAvailable = getTotalAvailablePositions(jobs);

        // Flatten the applicants arrays from all jobs into one array of ObjectIds
        const applicantIDS = jobs.flatMap((job) =>
          job.applicants.map((applicant) => applicant.resident_id)
        );

        // Query Resident model to find residents matching these IDs that applied to jobs
        const applicants = await Resident.find({
          _id: { $in: applicantIDS },
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
          positionsAvailable,
          applicants,
          jobs,
        });
      }
    } catch (err) {
      console.log(err);
      logger.warn("Error serving Employer Dashboard: ", err);
      res.render("error/500");
    }
  },
  //serves contact page for employers
  async contact(req, res) {
    try {
      res.render("employer/contact", { user: req.session.user });
    } catch (err) {
      console.log(err);
      logger.warn("Error serving contact page: ", err);
      res.render("error/505");
    }
  },
  //serves help desk page for employers
  async helpDesk(req, res) {
    try {
      res.render("employer/helpDesk", { user: req.session.user });
    } catch (err) {
      console.log(err);
      logger.warn("Error serving help desk page: ", err);
      res.render("error/505");
    }
  },
  async reports(req, res) {
    try {
      res.render("employer/reports", { user: req.session.user });
    } catch (err) {
      console.log(err);
      logger.warn("Error serving reports page: ", err);
      res.render("error/505");
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
      logger.warn("Error serving PI Employees page: ", err);
      res.render("error/505");
    }
  },
  //serves job profile info for specific job
  async jobProfile(req, res) {
    try {
      const { jobID } = req.params;
      const position = await Jobs.findById(jobID).lean();

      if (!position) {
        throw new Error("Job not found");
      }
      const companyID = position.companyID;

      // Extract `resident_id` from applicants array
      const applicantIds = position.applicants.map(
        (applicant) => applicant.resident_id
      );

      const applicants = await Resident.find({
        _id: { $in: applicantIds },
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
      logger.warn("Error serving job profile page: ", err);
      res.render("error/505");
    }
  },
  //=============================
  //     Manage Workforce
  //=============================
  //serves manageWorkForce page for employers
  async manageWorkForce(req, res) {
    try {
      const companyName = req.session.user.companyName;

      // Find all resident IDs who have applied for jobs in the caseload
      let applicantIDS = [];
      const result = await Jobs.aggregate([
        { $match: { companyName: companyName } }, // Match jobs by companyName
        { $unwind: "$applicants" }, // Unwind the applicants array to process each one individually
        {
          $group: {
            _id: null, // Group all results together
            allResidents: { $push: "$applicants.resident_id" }, // Collect resident IDs from applicants
          },
        },
      ]);

      // If result is not empty, assign applicant IDs to applicantIDS
      if (result.length > 0) {
        applicantIDS = result[0].allResidents;
      }

      if (result.length > 0) {
        applicantIDS = result[0].allResidents;
      } else {
        console.log("No matching jobs found");
      }

      // Query the Resident model to find residents matching these IDs who applied for jobs
      const applicants = await Resident.find(
        {
          _id: { $in: applicantIDS },
        },
        {
          _id: 0,
          residentID: 1,
          firstName: 1,
          lastName: 1,
          outDate: 1,
          custodyLevel: 1,
          facility: 1,
        }
      ).lean();

      // Find interviews related to the company
      const findInterviews = await Jobs.aggregate([
        { $match: { companyName: companyName.toLowerCase() } },
        {
          $project: {
            _id: 0,
            interviews: 1,
            position: 1,
          },
        },
        { $unwind: "$interviews" },
        {
          $group: {
            _id: null,
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

      // Find jobs related to the company
      const jobs = await findJobs(companyName);
      const employeeIDs = jobs.flatMap((job) => job.employees); // Flatten employee IDs

      // Find employees at this company
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

      // Render the manageWorkForce page with the necessary data
      res.render("employer/manageWorkForce", {
        user: req.session.user,
        applicants,
        interviews,
        employees,
      });
    } catch (err) {
      console.error("Error managing workforce: ", err);
      logger.warn("Error managing workforce: ", err);
      res.render("error/505");
    }
  },

  async cancelInterview(req, res) {
    try {
      const { interviewID } = req.params;

      // Step 1: Delete the interview from the jobs collection
      await Jobs.updateOne(
        { "interviews._id": interviewID }, // Match the job by interview ID
        { $pull: { interviews: { _id: interviewID } } } // Pull (delete) the interview by _id
      );

      const companyName = req.session.user.companyName;

      // Step 2: Get all resident IDs from applicants in jobs for the given companyName
      const result = await Jobs.aggregate([
        { $match: { companyName: companyName } }, // Match jobs for the company
        { $unwind: "$applicants" }, // Flatten the applicants array
        {
          $group: {
            _id: null,
            allResidents: { $push: "$applicants.resident_id" },
          },
        }, // Gather resident IDs
      ]);

      let applicantIDS = [];
      if (result.length > 0) {
        applicantIDS = result[0].allResidents;
      } else {
        console.log("No matching jobs found");
      }

      // Step 3: Query the Resident model to fetch applicants using their IDs
      const applicants = await Resident.find({
        _id: { $in: applicantIDS },
      }).lean();

      // Step 4: Get all interviews for the company's jobs
      const findInterviews = await Jobs.aggregate([
        { $match: { companyName: companyName.toLowerCase() } }, // Match jobs by companyName
        { $project: { _id: 0, interviews: 1 } }, // Project the interviews field
        { $unwind: "$interviews" }, // Unwind the interviews array
        {
          $group: {
            _id: null, // Group all interviews into one array
            allInterviews: { $push: "$interviews" },
          },
        },
      ]);

      let interviews = [];
      if (findInterviews.length > 0) {
        interviews = findInterviews[0].allInterviews;
      }

      // Step 5: Render the manageWorkForce page with the updated data
      res.render("employer/manageWorkForce", {
        user: req.session.user,
        applicants,
        interviews,
      });
    } catch (err) {
      console.error("Error canceling interview:", err);
      logger.warn("An error occurred while canceling the interview: " + err);
      return res.render("error/500");
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
      logger.warn("An error occurred while managing company positions: ", err);
      return res.render("error/500");
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
      logger.warn("An error occurred while searching for a position: ", err);
      return res.render("error/500");
    }
  },
  //edits found position
  async editSearchedPosition(req, res) {
    try {
      const { jobID } = req.params;
      const {
        editPosition,
        description,
        skillSet,
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
            skillSet: skillSet,
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
      logger.warn("An error occurred while editing company position: ", err);
      return res.render("error/500");
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
        skillSet,
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
        skillSet,
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
      console.log(err);
      logger.warn(
        "An error occurred while adding a new company position: ",
        err
      );
      return res.render("error/500");
    }
  },
  //edits position on jobProfile
  async editPosition(req, res) {
    try {
      const { jobID } = req.params;
      const {
        editPosition,
        description,
        skillSet,
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
            skillSet: skillSet,
            pay: pay,
            availablePositions: availablePositions,
            isAvailable: isAvailable,
            facility: facility,
            jobPool: jobPool,
          },
        }
      );
      const position = await Jobs.findById(jobID).lean();
      if (!position) {
        throw new Error("Job not found");
      }
      const companyID = position.companyID;
      // Extract `resident_id` from applicants array
      const applicantIds = position.applicants.map(
        (applicant) => applicant.resident_id
      );

      const applicants = await Resident.find({
        _id: { $in: applicantIds },
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
      console.log(err);
      logger.warn("An error occurred while editing a company position: ", err);
      return res.render("error/500");
    }
  },
  //delete position
  async deletePosition(req, res) {
    try {
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
    } catch (err) {
      console.log(err);
      logger.warn("An error occurred while deleting company position: ", err);
      return res.render("error/500");
    }
  },
  //=============================
  //     Resident Profile
  //=============================
  //serves resident profile with their resume
  async residentProfile(req, res) {
    try {
      const { residentID } = req.params;

      const resident = await findResident(residentID);
      const res_id = resident._id;

      const companyID = await findCompanyID(req.session.user.companyName);

      //find applications specific to this company
      const applications = await getResidentApplications(companyID, res_id);

      const activeTab = "overview"; // Set the active tab for the profile

      // Render the employer profile page
      res.render(`employer/profiles/residentProfile`, {
        user: req.session.user,
        resident,
        applications,
        activeTab,
      });
    } catch (err) {
      console.error("Error fetching resident profile:", err);
      logger.warn("Error fetching resident profile:", err);
      res.render("error/500");
    }
  },

  async requestInterview(req, res) {
    try {
      let { residentID, preferences, additionalNotes } = req.body;
      const { jobID } = req.params;

      const resident = await findResident(residentID);

      const res_id = resident._id; // MongoDB ObjectId

      const name = `${resident.firstName} ${resident.lastName}`;
      const companyName = req.session.user.companyName;
      const userEmail = req.session.user.email;

      // Update the job with the interview request
      await Jobs.findByIdAndUpdate(jobID, {
        $push: {
          interviews: {
            isRequested: true,
            residentID,
            name,
            dateRequested: new Date(),
            preferredDate: preferences || null,
            employerInstructions: additionalNotes || "",
          },
        },
      });

      // Retrieve the updated job and return the _id of the last interview
      const updatedJob = await Jobs.findById(jobID).lean();
      if (!updatedJob || !updatedJob.interviews.length) {
        throw new Error("Interview request failed");
      }

      const interviewID =
        updatedJob.interviews[updatedJob.interviews.length - 1]._id;

      const companyID = await findCompanyID(req.session.user.companyName);

      //find applications specific to this company
      const applications = await getResidentApplications(companyID, res_id);

      console.log(applications);

      // Send notification email (handle failures gracefully)

      let devEmail = "kcicodingdev@gmail.com"; //change this in production
      sendRequestInterviewEmail(
        resident,
        companyName,
        devEmail, // Change to production email
        userEmail,
        interviewID
      );

      // Render the resident's profile page
      const activeTab = "application";
      res.render("employer/profiles/residentProfile", {
        user: req.session.user,
        resident,
        activeTab,
        applications,
      });
    } catch (err) {
      console.error("Error requesting interview:", err.stack);
      logger.warn(
        "An error occurred while requesting the interview: " + err.message
      );

      res.render("error/500");
    }
  },
  async requestHire(req, res) {
    try {
      const { jobID } = req.params;

      const {
        residentID,
        unitTeamName,
        hireRequestStartDate,
        unitTeamEmail,
        hireRequestInfo,
      } = req.body;

      const resident = await Resident.findOne({ residentID }).lean();
      const res_id = resident._id;
      const companyName = req.session.user.companyName;
      const sender = req.session.user.email;

      const recipient = "kcicodingdev@gmail.com"; //-->> only for development

      sendRequestHireEmail(resident, companyName, recipient, sender, jobID);

      await Jobs.findOneAndUpdate(
        {
          _id: jobID, // Find the job by its _id
          "applicants.resident_id": res_id, // Find the applicant inside that job
        },
        {
          $set: {
            "applicants.$.hireRequest": true, // Update hireRequest
            "applicants.$.hireRequestDate": new Date(),
            "applicants.$.hireRequestStartDate": hireRequestStartDate,
            "applicants.$.hireRequestInfo": hireRequestInfo,
          },
        }
      );

      const companyID = await findCompanyID(req.session.user.companyName);

      //find applications specific to this company
      const applications = await getResidentApplications(companyID, res_id);
      const activeTab = "application";

      res.render(`employer/profiles/residentProfile`, {
        user: req.session.user,
        resident,
        activeTab,
        applications,
      });
    } catch (err) {
      console.log("Error requesting resident employment: ", err);
      logger.warn("Error fetching resident profile:", err);
      res.render("error/500");
    }
  },
  //rejects resident application
  async rejectHire(req, res) {
    try {
      const { id, jobID } = req.params;

      await Resident.findByIdAndUpdate(id, {
        $set: {
          isHired: false,
        },
      });
      const resident = await Resident.findById(id).lean();
      const residentID = resident.residentID;
      const res_id = resident._id;

      //remove user from applicants/ interviews
      await Jobs.findByIdAndUpdate(jobID, {
        $pull: {
          applicants: { resident_id: id },
          interviews: { residentID: residentID },
        },
      });

      const companyID = await findCompanyID(req.session.user.companyName);

      //find applications specific to this company
      const applications = await getResidentApplications(companyID, res_id);

      const activeTab = "application";
      res.render(`employer/profiles/residentProfile`, {
        user: req.session.user,
        resident,
        activeTab,
        applications,
      });
    } catch (err) {
      console.log(err);
    }
  },
};
