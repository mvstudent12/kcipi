//=============================
//    Global Imports
//=============================
//database models
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

const { createActivityLog } = require("../utils/activityLogUtils");

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
      logger.warn("Error serving PI Contact Dashboard: ", err);
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

  //serves manageWorkForce page for employers
  async manageWorkForce(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const companyName = req.session.user.companyName;

      // Find all resident IDs who have applied for jobs in the caseload
      let applicantIDs = [];
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

      // If result is not empty, assign applicant IDs to applicantIDs
      if (result.length > 0) {
        applicantIDs = result[0].allResidents;
      }

      if (result.length > 0) {
        applicantIDs = result[0].allResidents;
      } else {
        console.log("No matching jobs found for applicants");
      }

      // Query the Resident model to find residents matching these IDs who applied for jobs
      const applicants = await Resident.find(
        {
          _id: { $in: applicantIDs },
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
        { $unwind: "$applicants" }, // Unwind applicants array
        { $match: { "applicants.interview.status": { $ne: "none" } } }, // Filter only applicants with valid interviews
        {
          $project: {
            _id: 0,
            interview: "$applicants.interview", // Extract interview details
            residentID: "$applicants.residentID", // Extract residentID
            residentName: "$applicants.residentName", // Extract residentName
            position: 1, // Keep job position
          },
        },
        {
          $group: {
            _id: null,
            allInterviews: {
              $push: {
                interview: "$interview",
                residentID: "$residentID",
                residentName: "$residentName",
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

  //=============================
  //     Manage Positions
  //=============================
  async managePositions(req, res) {
    let { activeTab, addMsg, deleteErr, editMsg } = req.query;
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
      if (!activeTab) activeTab = "all";
      res.render("employer/managePositions", {
        user: req.session.user,
        notifications,
        company,
        jobs,
        activeTab,
        addMsg,
        deleteErr,
        editMsg,
      });
    } catch (err) {
      console.log(err);
      logger.warn("An error occurred while managing company positions: ", err);
      return res.render("error/500");
    }
  },
  //find position to edit
  async searchPosition(req, res) {
    const { jobID } = req.body;
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
    try {
      // Ensure isAvailable is treated as a proper boolean (true or false)
      let isAvailableBool =
        isAvailable === true || isAvailable === "true" ? true : false;

      // Ensure availablePositions is a valid number
      let updatedAvailablePositions = parseInt(availablePositions, 10) || 0;

      // Enforce the rules:
      // If isAvailable is true, availablePositions must be at least 1
      if (isAvailableBool && updatedAvailablePositions <= 0) {
        updatedAvailablePositions = 1;
      }

      // If availablePositions is 0, isAvailable must be false
      if (updatedAvailablePositions === 0) {
        isAvailableBool = false;
      }

      await Jobs.findOneAndUpdate(jobID, {
        $set: {
          position: editPosition,
          description: description,
          skillSet: skillSet,
          pay: pay,
          availablePositions: updatedAvailablePositions,
          isAvailable: isAvailableBool,
          facility: facility,
          jobPool: jobPool,
        },
      });

      // Log activity
      await createActivityLog(
        req.session.user._id.toString(),
        "edited_position",
        `Edited job position: ${editPosition}.`
      );

      res.redirect(`/employer/managePositions?activeTab=all&editMsg=true`);
    } catch (err) {
      console.log(err);
      logger.warn("An error occurred while editing company position: ", err);
      return res.render("error/500");
    }
  },
  //adds new position to company db
  async addNewPosition(req, res) {
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
    try {
      // Ensure `companyID` is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(companyID)) {
        console.log("Invalid company ID from managePositions Form");
        // return res.status(400).json({ error: "Invalid company ID" });
      }
      if (skillSet === "") {
        skillSet = "None";
      }

      await Jobs.create({
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

      // Log activity
      await createActivityLog(
        req.session.user._id.toString(),
        "added_position",
        `Created new job position: ${position}.`
      );

      res.redirect(`/employer/managePositions?activeTab=all&addMsg=true`);
    } catch (err) {
      console.log(err);
      logger.warn(
        "An error occurred while adding a new company position: ",
        err
      );
      return res.render("error/500");
    }
  },
  //delete position from db - permanent
  async deletePosition(req, res) {
    const { jobID } = req.params;
    try {
      //check to see if position curerntly has employees

      const jobHasEmployees = await Jobs.findOne(
        { _id: jobID, employees: { $exists: true, $not: { $size: 0 } } },
        { _id: 1 }
      );

      if (!jobHasEmployees) {
        // Deleting position by ID
        await Jobs.deleteOne({ _id: jobID })
          .then((result) => {
            console.log("Delete Result:", result);
          })
          .catch((error) => {
            console.error("Error deleting document:", error);
          });
        // Log activity
        await createActivityLog(
          req.session.user._id.toString(),
          "deleted_position",
          `Deleted job position.`
        );

        res.redirect(`/employer/managePositions?activeTab=all`);
      } else {
        res.redirect(`/employer/managePositions?activeTab=all&deleteErr=true`);
      }
    } catch (err) {
      console.log(err);
      logger.warn("An error occurred while deleting company position: ", err);
      return res.render("error/500");
    }
  },
  //=============================
  //    Job Profile
  //=============================
  //serves job profile info for specific job
  async jobProfile(req, res) {
    let { activeTab, saveMsg } = req.query;
    const { jobID } = req.params;
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
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
      if (!activeTab) activeTab = "overview";

      res.render("employer/profiles/jobProfile", {
        user: req.session.user,
        notifications,
        position,
        company,
        activeTab,
        applicants,
        saveMsg,
      });
    } catch (err) {
      console.log(err);
      logger.warn("Error serving job profile page: ", err);
      res.render("error/505");
    }
  },
  //edits existing position on jobProfile
  async editPosition(req, res) {
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
    try {
      // Ensure availablePositions is a valid number
      let updatedAvailablePositions = parseInt(availablePositions, 10) || 0;

      // Automatically set isAvailable based on availablePositions
      let isAvailableBool = updatedAvailablePositions > 0;

      await Jobs.findOneAndUpdate(jobID, {
        $set: {
          position: editPosition,
          description: description,
          skillSet: skillSet,
          pay: pay,
          availablePositions: updatedAvailablePositions,
          isAvailable: isAvailableBool,
          facility: facility,
          jobPool: jobPool,
        },
      });
      // Log activity
      await createActivityLog(
        req.session.user._id.toString(),
        "edited_position",
        `Edited job position: ${editPosition}.`
      );

      res.redirect(
        `/employer/jobProfile/${jobID}?activeTab=overview&saveMsg=true`
      );
    } catch (err) {
      console.log(err);
      logger.warn("An error occurred while editing a company position: ", err);
      return res.render("error/500");
    }
  },

  //=============================
  //     Resident Profile
  //=============================
  //serves resident profile with their resume
  async residentProfile(req, res) {
    const { residentID } = req.params;
    let { activeTab } = req.query;
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );

      const resident = await findResident(residentID);

      //find applications specific to this company
      const applications = await getResidentApplications(
        req.session.user.companyName,
        resident.residentID
      );

      if (!activeTab) activeTab = "overview"; // Set the active tab for the profile
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
    let { residentID, preferences, additionalNotes } = req.body;
    const { applicationID } = req.params;
    try {
      const resident = await findResident(residentID);
      const companyName = req.session.user.companyName;

      //update application with interview request
      await Jobs.findOneAndUpdate(
        { "applicants._id": applicationID },
        {
          $set: {
            "applicants.$.interview": {
              "applicants.$.interview.status": "requested",
              "applicants.$.preferredDate": preferences || null,
              "applicants.$.employerInstructions": additionalNotes || "",
              "applicants.$.requestedBy": req.session.user.email,
              "applicants.$.dateRequested": new Date(),
            },
          },
        }
      );
      //find and return the updated application
      const updatedApplication = await Jobs.findOne(
        { "applicants._id": applicationID },
        {
          "applicants.$": 1, // Project only the matched applicant
        }
      ).lean();

      //check to make sure it exists
      if (!updatedApplication || !updatedApplication.applicants[0]) {
        throw new Error("Interview request failed");
      }

      // Send notification email to unit team
      //const recipient = resident.resume.unitTeam -->only in production
      const recipient = "kcicodingdev@gmail.com"; //--> only for development
      sendRequestInterviewEmail(
        resident,
        companyName,
        recipient, // Change to production email
        req.session.user.email,
        applicationID
      );

      //send notification to unit team of this interview request on their dashboard
      await createNotification(
        resident.resume.unitTeam,
        "unitTeam",
        "interview_request",
        `New interview request for resident #${residentID}.`,
        `/unitTeam/reviewInterviewRequest/${applicationID}`
      );

      // Log activity
      await createActivityLog(
        req.session.user._id.toString(),
        "interview_requested",
        `Requested interview with resident #${residentID}.`
      );

      res.redirect(
        `/employer/residentProfile/${residentID}?activeTab=application`
      );
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
    const { applicationID } = req.params;
    const {
      residentID,
      unitTeamName,
      hireRequestStartDate,
      unitTeamEmail,
      hireRequestInfo,
    } = req.body;
    try {
      const resident = await Resident.findOne({ residentID }).lean();

      const companyName = req.session.user.companyName;
      const sender = req.session.user.email;

      //const recipient = resident.resume.unitTeam
      const recipient = "kcicodingdev@gmail.com"; //-->> only for development

      //send email to unit team about this request
      sendRequestHireEmail(
        resident,
        companyName,
        recipient,
        sender,
        applicationID
      );

      await Jobs.findOneAndUpdate(
        { "applicants._id": applicationID },
        {
          $set: {
            "applicants.$.hireRequest": true, // Update hireRequest
            "applicants.$.hireRequestDate": new Date(),
            "applicants.$.hireRequestStartDate": hireRequestStartDate,
            "applicants.$.hireRequestInfo": hireRequestInfo,
          },
        }
      );

      //send notification to unit team of this request
      await createNotification(
        resident.resume.unitTeam,
        "unitTeam",
        "employment_request",
        `New ${req.session.user.companyName} employment request for resident #${resident.residentID}.`,
        `/unitTeam/reviewHireRequest/${applicationID}`
      );

      // Log activity
      await createActivityLog(
        req.session.user._id.toString(),
        "employment_requested",
        `Requested employment for resident #${residentID}.`
      );

      res.redirect(
        `/employer/residentProfile/${residentID}?activeTab=application`
      );
    } catch (err) {
      console.log("Error requesting resident employment: ", err);
      logger.warn("Error fetching resident profile:", err);
      res.render("error/500");
    }
  },
  //send termination request to unit team
  async requestTermination(req, res) {
    const { res_id } = req.params;
    const { terminationReason, notes } = req.body;
    try {
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
        `Termination request for resident #${resident.residentID}.`,
        `/unitTeam/reviewTerminationRequest/${resident._id}`
      );

      // Log activity
      await createActivityLog(
        req.session.user._id.toString(),
        "termination_requested",
        `Requested termination for resident #${resident.residentID}.`
      );

      res.redirect(
        `/employer/residentProfile/${resident.residentID}?activeTab=application`
      );
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
    const { res_id, applicationID } = req.params;

    try {
      const resident = await Resident.findById(res_id).lean();
      const residentID = resident.residentID;

      //remove user from applicants
      const updatedJob = await Jobs.findOneAndUpdate(
        { "applicants._id": applicationID }, // Find the job containing the applicant by _id
        {
          $pull: {
            applicants: { _id: applicationID }, // Pull the applicant by _id
          },
        },
        { new: true } // Return the updated job document
      );

      await createNotification(
        resident.resume.unitTeam,
        "unitTeam",
        "resident_rejected",
        `Resident #${residentID} rejected for hiring by ${req.session.user.companyName}.`,
        `/shared/residentProfile/${residentID}?activeTab=activities`
      );

      // Log activity
      await createActivityLog(
        req.session.user._id.toString(),
        "application_rejected",
        `Rejected application for resident #${residentID}.`
      );
      await createActivityLog(
        resident._id.toString(),
        "application_rejected",
        `Application for ${updatedJob.companyName} not accepted at this time.`
      );

      res.redirect(
        `/employer/residentProfile/${residentID}?activeTab=application`
      );
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //=============================
  //   Reports
  //=============================

  async reports(req, res) {
    let { noData } = req.query;
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      if (!noData) noData = false;
      res.render("shared/reports", {
        user: req.session.user,
        notifications,
        noData,
      });
    } catch (err) {
      console.log(err);
      logger.warn("Error serving reports page: ", err);
      res.render("error/505");
    }
  },
  //report on all current interviews
  async interviewReport(req, res) {
    try {
      const selectedFields = Object.keys(req.body);

      if (selectedFields.length === 0) {
        return res.redirect("/employer/reports?noData=true");
      }
      const companyName = req.session.user.companyName;

      const company = await Company.findOne({
        companyName: companyName,
      }).lean();
      const companyID = company._id;

      //find all interviews & resident info by companyID
      const interviews = await findResidentsFromInterviews(companyID);

      if (interviews.length === 0) {
        return res.redirect("/employer/reports?noData=true");
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
      const companyName = req.session.user.companyName;
      const selectedFields = Object.keys(req.body);

      if (selectedFields.length === 0) {
        return res.redirect("/employer/reports?noData=true");
      }

      // find all employed residents from specific company
      const residents = await Resident.find(
        { isHired: true, companyName: companyName },
        selectedFields.join(" ")
      ).lean();

      if (residents.length === 0) {
        return res.redirect("/employer/reports?noData=true");
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
        return res.redirect("/employer/reports?noData=true");
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
};
