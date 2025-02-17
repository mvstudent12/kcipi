//=============================
//    Global Imports
//=============================
//database models
const Notification = require("../models/Notification");
const ActivityLog = require("../models/ActivityLog");
const Resident = require("../models/Resident");
const Company = require("../models/Company");
const Jobs = require("../models/Jobs");

//various modules & dependencies
const { Parser } = require("json2csv");
const mongoose = require("mongoose");
const logger = require("../utils/logger");

//email notification functions
const {
  sendRequestInterviewEmail,
  sendRequestHireEmail,
  sendTerminationRequestEmail,
} = require("../utils/emailUtils/notificationEmail");

//util functions for PI Employers
const {
  getTotalAvailablePositions,
  findJobs,
  findCompanyID,
  findResident,
  getResidentApplications,
  findResidentsFromInterviews,
  findApplicantsByCompany,
} = require("../utils/employerUtils");

const {
  getUserNotifications,
  createNotification,
} = require("../utils/notificationUtils");

module.exports = {
  //serves dashboard page for PI Employers
  async dashboard(req, res) {
    try {
      //find notifications for user
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const companyName = req.session.user.companyName;

      //find jobs that have positions available
      const availableJobs = await Jobs.find({
        companyName: companyName,
        availablePositions: { $gt: 0 },
      }).lean();

      //find all jobs
      const jobs = await Jobs.find({
        companyName: companyName,
      }).lean();

      //check if jobs exist for this company
      if (jobs) {
        //calculate total number of available positions
        let positionsAvailable = getTotalAvailablePositions(availableJobs);

        // Flatten the applicants arrays from all jobs into one array of ObjectIds
        const applicantIDS = availableJobs.flatMap((job) =>
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
          notifications,
          positionsAvailable,
          employees,
          applicants,
          availableJobs,
          notifications,
        });
      } else {
        //if there are no current applicants
        let positionsAvailable = 0;
        let applicants = 0;
        res.render("employer/dashboard", {
          user: req.session.user,
          notifications,
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
  //serves PI employees/ current workforce page
  async employees(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
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
        notifications,
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
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
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
        notifications,
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
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
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
        notifications,
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

  //serves managePositions page from employer dashboard
  //=============================
  //     Manage Positions
  //=============================
  async managePositions(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
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
        notifications,
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
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
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
        notifications,
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
  //allows editing the data found when position was searched
  async editSearchedPosition(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
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
        notifications,
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
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      let {
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
      if (skillSet === "") {
        skillSet = "None";
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
        notifications,
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
  //edits existing position on jobProfile
  async editPosition(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
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
        notifications,
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
  //delete position from db - permanent
  async deletePosition(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { jobID } = req.params;

      // Deleting position by ID
      await Jobs.deleteOne({ _id: jobID })
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
        notifications,
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
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
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
        notifications,
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
  //send resident interview request to unit team
  async requestInterview(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      let { residentID, preferences, additionalNotes } = req.body;
      const { jobID } = req.params;

      const resident = await findResident(residentID);

      const res_id = resident._id; // MongoDB ObjectId

      const name = `${resident.firstName} ${resident.lastName}`;
      const companyName = req.session.user.companyName;

      // Update the job with the interview request
      await Jobs.findByIdAndUpdate(jobID, {
        $push: {
          interviews: {
            isRequested: true,
            requestedBy: req.session.user.email,
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

      // Send notification email to unit team

      //const recipient = resident.resume.unitTeam -->only in production

      const recipient = "kcicodingdev@gmail.com"; //--> only for development
      sendRequestInterviewEmail(
        resident,
        companyName,
        recipient, // Change to production email
        req.session.user.email,
        interviewID
      );

      //send notification to unit team of this interview request on their dashboard
      await createNotification(
        resident.resume.unitTeam,
        "unitTeam",
        "interview_request",
        `New interview request for resident #${resident.residentID}.`
      );

      const activeTab = "application"; // Render the resident's profile page
      res.render("employer/profiles/residentProfile", {
        user: req.session.user,
        notifications,
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
  //send hiring request to unit team
  async requestHire(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { jobID, res_id } = req.params;

      const {
        residentID,
        unitTeamName,
        hireRequestStartDate,
        unitTeamEmail,
        hireRequestInfo,
      } = req.body;

      const resident = await Resident.findOne({ residentID }).lean();

      const companyName = req.session.user.companyName;
      const sender = req.session.user.email;

      //const recipient = resident.resume.unitTeam
      const recipient = "kcicodingdev@gmail.com"; //-->> only for development

      //send email to unit team about this request
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

      //send notification to unit team of this request
      await createNotification(
        resident.resume.unitTeam,
        "unitTeam",
        "employment_request",
        `New ${req.session.user.companyName} employment request for resident #${resident.residentID}.`
      );

      const activeTab = "application";
      res.render(`employer/profiles/residentProfile`, {
        user: req.session.user,
        notifications,
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
  //send termination request to unit team
  async requestTermination(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { res_id } = req.params;
      const { terminationReason, notes } = req.body;
      //update resident termination request
      await Resident.updateOne(
        { _id: res_id },
        {
          $set: {
            "terminationRequest.companyName": req.session.user.companyName,
            "terminationRequest.terminationReason": terminationReason,
            "terminationRequest.notes": notes,
            "terminationRequest.requestDate": new Date(), // Update request date
          },
        }
      );

      const resident = await Resident.findOne({ _id: res_id }).lean();
      const companyID = await findCompanyID(req.session.user.companyName);

      //const recipient = resident.resume.unitTeam  -->for production

      const recipient = "kcicodingdev@gmail.com"; //--> for development

      //send termination request email
      sendTerminationRequestEmail(
        resident,
        req.session.user.companyName,
        recipient,
        req.session.user.email
      );

      await createNotification(
        resident.resume.unitTeam,
        "unitTeam",
        "termination_request",
        `Termination request for resident #${resident.residentID}.`
      );

      //find applications specific to this company
      const applications = await getResidentApplications(companyID, res_id);
      const activeTab = "application";
      res.render(`employer/profiles/residentProfile`, {
        user: req.session.user,
        notifications,
        resident,
        activeTab,
        applications,
      });
    } catch (err) {
      console.log(
        "There was an error in termination request to unit team: ",
        err
      );
      res.render("error/500");
    }
  },
  //rejects resident application
  async rejectHire(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
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

      await createNotification(
        resident.resume.unitTeam,
        "unitTeam",
        "resident_rejected",
        `Resident #${resident.residentID} rejected for hiring by ${req.session.user.companyName}.`
      );

      const activeTab = "application";
      res.render(`employer/profiles/residentProfile`, {
        user: req.session.user,
        notifications,
        resident,
        activeTab,
        applications,
      });
    } catch (err) {
      console.log(err);
    }
  },
  //=============================
  //   Reports
  //=============================

  async reports(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      res.render("employer/reports", { user: req.session.user });
    } catch (err) {
      console.log(err);
      logger.warn("Error serving reports page: ", err);
      res.render("error/505");
    }
  },
  //report on all current interviews
  async interviewReport(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const selectedFields = Object.keys(req.body);

      if (selectedFields.length === 0) {
        const noData = true;
        return res.render("employer/reports", {
          user: req.session.user,
          notifications,
          noData,
        });
      }
      const companyName = req.session.user.companyName;

      const company = await Company.findOne({
        companyName: companyName,
      }).lean();
      const companyID = company._id;

      //find all interviews & resident info by companyID
      const interviews = await findResidentsFromInterviews(companyID);

      if (interviews.length === 0) {
        const noData = true;
        return res.render("employer/reports", {
          user: req.session.user,
          noData,
        });
      }

      // // Convert data to CSV
      const json2csvParser = new Parser({ fields: selectedFields });
      const csv = json2csvParser.parse(interviews);

      // Set response headers to trigger file download
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="PI_interviews_report.csv"'
      );
      res.setHeader("Content-Type", "text/csv");

      res.status(200).send(csv);
    } catch (err) {
      console.log(err);
      logger.warn("Error generating report: " + err);
      res.render("error/500");
    }
  },
  //report on all employed residents in company
  async employedResidentsReport(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const companyName = req.session.user.companyName;
      const selectedFields = Object.keys(req.body);

      if (selectedFields.length === 0) {
        const noData = true;
        return res.render("employer/reports", {
          user: req.session.user,
          notifications,
          noData,
        });
      }

      // find all employed residents from specific company
      const residents = await Resident.find(
        { isHired: true, companyName: companyName },
        selectedFields.join(" ")
      ).lean();

      if (residents.length === 0) {
        const noData = true;
        return res.render("employer/reports", {
          user: req.session.user,
          notifications,
          noData,
        });
      }

      // Convert data to CSV
      const json2csvParser = new Parser({ fields: selectedFields });
      const csv = json2csvParser.parse(residents);

      // Set response headers to trigger file download
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="PI_employees_report.csv"'
      );
      res.setHeader("Content-Type", "text/csv");

      res.status(200).send(csv);
    } catch (err) {
      console.log(err);
      logger.warn("Error generating report: " + err);
      res.render("error/500");
    }
  },
  //report all current applicants
  async applicantsReport(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const selectedFields = Object.keys(req.body);

      if (selectedFields.length === 0) {
        const noData = true;
        return res.render("unitTeam/reports", {
          user: req.session.user,
          notifications,
          noData,
        });
      }

      const companyName = req.session.user.companyName;

      const company = await Company.findOne({
        companyName: companyName,
      }).lean();
      const companyID = company._id;

      //find all applicants by companyID
      let applicants = await findApplicantsByCompany(companyID);

      if (applicants.length === 0) {
        const noData = true;
        return res.render("employer/reports", {
          user: req.session.user,
          notifications,
          noData,
        });
      }

      // // Convert data to CSV
      const json2csvParser = new Parser({ fields: selectedFields });
      const csv = json2csvParser.parse(applicants);

      // Set response headers to trigger file download
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="PI_applicants_report.csv"'
      );
      res.setHeader("Content-Type", "text/csv");

      res.status(200).send(csv);
    } catch (err) {
      console.log(err);
      logger.warn("Error generating report: " + err);
      res.render("error/500");
    }
  },
  //=============================
  //     Basic Routes
  //=============================
  //serves contact page for employers
  async contact(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      res.render("employer/contact", { user: req.session.user, notifications });
    } catch (err) {
      console.log(err);
      logger.warn("Error serving contact page: ", err);
      res.render("error/505");
    }
  },
  //serves help desk page for employers
  async helpDesk(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      res.render("employer/helpDesk", {
        user: req.session.user,
        notifications,
      });
    } catch (err) {
      console.log(err);
      logger.warn("Error serving help desk page: ", err);
      res.render("error/505");
    }
  },
};
