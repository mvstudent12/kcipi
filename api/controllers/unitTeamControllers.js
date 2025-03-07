const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");
const UnitTeam = require("../models/UnitTeam");

const { Parser } = require("json2csv");
const mongoose = require("mongoose");

const logger = require("../utils/logger");

const {
  getEmployeeEmails,
  sendNotificationsToEmployers,
} = require("../utils/clearanceUtils");

const {
  findUnitTeamCaseload,
  findInterviewsInCaseload,
  findApplicantIDsAndCompanyName,
  findResidentsWithCompany,
  createApplicantsReport,
} = require("../utils/kdocStaffUtils");

const { getUserNotifications } = require("../utils/notificationUtils");

const { getTotalAvailablePositions } = require("../utils/employerUtils");

module.exports = {
  //===============================
  //        Dashboard
  //===============================
  async dashboard(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );

      //find caseload specific to UTM
      const caseLoad = await findUnitTeamCaseload(req.session.user.email);

      //make array of resident _id in caseload
      const IDs = caseLoad.flatMap((resident) => resident._id);

      //make array of residentIDs in caseload
      const residentIDs = caseLoad.flatMap((resident) => resident.residentID);

      let applicantIDs = await findApplicantIDsAndCompanyName(IDs);

      //find all residents with applications in
      const applicants = await findResidentsWithCompany(applicantIDs);

      //find all residents who are actively hired
      const employees = await Resident.find({
        "resume.unitTeam": req.session.user.email,
        isHired: true,
        isActive: true,
      })
        .sort({ lastName: 1 })
        .lean();

      //find all active interviews
      const interviews = await findInterviewsInCaseload(residentIDs);
      console.log(interviews);

      //count pending resumes for this member
      const pendingResumes = await Resident.countDocuments({
        "resume.status": "pending",
        "resume.unitTeam": req.session.user.email,
        isActive: true,
      });

      res.render("shared/dashboard", {
        user: req.session.user,
        notifications,
        caseLoad,
        applicants,
        interviews,
        employees,
        pendingResumes,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },

  //===============================
  //       Manage
  //===============================
  async manageWorkForce(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const email = req.session.user.email;

      const caseLoad = await findUnitTeamCaseload(email);

      //make array of resident _id in caseload
      const IDs = caseLoad.flatMap((resident) => resident._id);

      //make array of residentID in caseload
      const residentIDs = caseLoad.flatMap((resident) => resident.residentID);

      let applicantIDs = await findApplicantIDsAndCompanyName(IDs);

      const applicants = await findResidentsWithCompany(applicantIDs);

      const interviews = await findInterviewsInCaseload(residentIDs);

      //find all residents who are actively hired
      const employees = await Resident.find({
        "resume.unitTeam": email,
        isHired: true,
        isActive: true,
      })
        .sort({ lastName: 1 })
        .lean();

      const jobs = await Jobs.find({
        facility: req.session.user.facility,
        isAvailable: true,
      }).lean();

      let positionsAvailable = getTotalAvailablePositions(jobs);
      res.render("shared/manageWorkForceKDOC", {
        user: req.session.user,
        notifications,
        applicants,
        interviews,
        employees,
        jobs,
        positionsAvailable,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async reviewInterviewRequest(req, res) {
    const { applicationID } = req.params;
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const jobApplicant = await Jobs.findOne(
        { "applicants._id": new mongoose.Types.ObjectId(applicationID) },
        { "applicants.$": 1, companyName: 1 } // Return only the matched application
      ).lean();
      const application = jobApplicant.applicants[0];

      const residentID = application.residentID;
      const resident = await Resident.findOne({
        residentID: residentID,
      }).lean();
      res.render("unitTeam/requestInterview", {
        user: req.session.user,
        application,
        jobApplicant,
        resident,
        notifications,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async reviewTerminationRequest(req, res) {
    const { res_id } = req.params;
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const resident = await Resident.findOne({ _id: res_id }).lean();
      const unitTeam = await UnitTeam.findOne({
        email: resident.resume.unitTeam,
      }).lean();

      req.session.user = unitTeam;
      res.render("unitTeam/requestTermination", {
        user: req.session.user,
        resident,
        notifications,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },

  async scheduleInterview(req, res) {
    const { applicationID } = req.params;
    const { date, time, instructions, residentID } = req.body;
    try {
      const updatedInterview = await Jobs.findOneAndUpdate(
        { "applicants._id": new mongoose.Types.ObjectId(applicationID) },
        {
          $set: {
            "applicants.$.interview.status": "scheduled",
            "applicants.$.interview.dateScheduled": date,
            "applicants.$.interview.time": time,
            "applicants.$.interview.instructions": instructions.trim() || "",
          },
        },
        { new: true } // Return the updated document
      ).lean();

      if (!updatedInterview) {
        return {
          success: false,
          message: "Application not found or update failed",
        };
      }

      // Find the updated applicant from the applicants array
      const updatedApplicant = updatedInterview.applicants.find(
        (app) => app._id.toString() === applicationID
      );

      //send notification to all PI partners in that company
      const employerEmails = await getEmployeeEmails(
        updatedInterview.companyName
      );

      await sendNotificationsToEmployers(
        employerEmails,
        "interview_scheduled",
        `New interview scheduled for resident #${residentID}.`,
        `/employer/residentProfile/${residentID}?activeTab=application`
      );

      res.redirect(`/unitTeam/reviewInterviewRequest/${applicationID}`);
    } catch (err) {
      console.error("Error scheduling interview:", err);
      logger.warn("An error occurred while scheduling the interview: " + err);
      res.render("error/500");
    }
  },
  async cancelInterviewRequest(req, res) {
    const { applicationID } = req.params;
    try {
      //update application with interview request
      const updatedInterview = await Jobs.findOneAndUpdate(
        { "applicants._id": applicationID },
        {
          $set: {
            "applicants.$.interview.status": "none",
            "applicants.$.interview.preferredDate": null,
            "applicants.$.interview.employerInstructions": "",
            "applicants.$.interview.requestedBy": null,
            "applicants.$.interview.dateRequested": null,
            "applicants.$.interview.dateScheduled": null,
            "applicants.$.interview.time": null,
            "applicants.$.interview.instructions": null,
          },
        },
        { new: true }
      );

      //send notification to all PI partners in that company
      const employerEmails = await getEmployeeEmails(
        updatedInterview.companyName
      );

      // Find the updated applicant from the applicants array
      const updatedApplicant = updatedInterview.applicants.find(
        (app) => app._id.toString() === applicationID
      );

      await sendNotificationsToEmployers(
        employerEmails,
        "interview_cancelled",
        `Interview request cancelled for resident #${updatedApplicant.residentID}.`,
        `/employer/residentProfile/${updatedApplicant.residentID}?activeTab=application`
      );
      res.redirect(`/unitTeam/reviewInterviewRequest/${applicationID}`);
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async reviewHireRequest(req, res) {
    const { applicationID } = req.params;
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const findApplication = await Jobs.findOne(
        { "applicants._id": applicationID },
        { "applicants.$": 1 } // Return the matched application from the applicants array
      ).lean();

      if (findApplication) {
        const application = findApplication.applicants[0];

        const job = await Jobs.findOne({
          "applicants._id": applicationID,
        }).lean();

        const resident = await Resident.findById({
          _id: application.resident_id,
        }).lean();
        const email = resident.resume.unitTeam;
        const unitTeam = await UnitTeam.findOne({ email }).lean();

        req.session.user = unitTeam;

        return res.render("unitTeam/requestHire", {
          application,
          resident,
          user: req.session.user,
          job,
          notifications,
        });
      } else {
        return res.render("unitTeam/requestHire", {
          user: req.session.user,
          notifications,
        });
      }
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async manageClearance(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );

      //find caseload specific to UTM
      const caseLoad = await findUnitTeamCaseload(req.session.user.email);

      res.render("shared/manageClearanceKDOC", {
        user: req.session.user,
        notifications,
        caseLoad,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //===============================
  //        ROSTERS
  //===============================
  async residents(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const facility = req.session.user.facility;
      //find all residents in this Unit Team's facility
      const caseLoad = await Resident.find({ facility, isActive: true })
        .sort({ lastName: 1 })
        .lean();

      res.render("unitTeam/tables/residents", {
        user: req.session.user,
        notifications,
        caseLoad,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async resumes(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const facility = req.session.user.facility;
      const caseLoad = await Resident.find({ facility, isActive: true })
        .sort({ lastName: 1 })
        .lean();
      res.render("unitTeam/tables/resumes", {
        user: req.session.user,
        notifications,
        caseLoad,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async clearance(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const facility = req.session.user.facility;
      const caseLoad = await Resident.find({ facility, isActive: true })
        .sort({ lastName: 1 })
        .lean();
      res.render("unitTeam/tables/clearance", {
        user: req.session.user,
        notifications,
        caseLoad,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async cleared(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const facility = req.session.user.facility;
      const caseLoad = await Resident.find({
        facility,
        isActive: true,
        "workEligibility.status": "approved",
      })
        .sort({ lastName: 1 })
        .lean();
      res.render("unitTeam/tables/cleared", {
        user: req.session.user,
        notifications,
        caseLoad,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async applicants(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const facility = req.session.user.facility;

      const caseLoad = await Resident.find({ facility, isActive: true })
        .sort({ lastName: 1 })
        .lean();

      //make array of resident _id in caseload
      const IDs = caseLoad.flatMap((resident) => resident._id);

      let applicantIDs = await findApplicantIDsAndCompanyName(IDs);

      const applicants = await findResidentsWithCompany(applicantIDs);

      res.render("unitTeam/tables/applicants", {
        user: req.session.user,
        notifications,
        applicants,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async employees(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const facility = req.session.user.facility;

      const employees = await Resident.find({
        facility: facility,
        isHired: true,
        isActive: true,
      })
        .sort({ lastName: 1 })
        .lean();

      res.render("unitTeam/tables/employees", {
        user: req.session.user,
        notifications,
        employees,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //===============================
  //        REPORTS
  //===============================
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
      res.render("error/500");
    }
  },
  async residentReport(req, res) {
    try {
      const facility = req.session.user.facility;
      const selectedFields = Object.keys(req.body);

      if (selectedFields.length === 0) {
        return res.redirect(`/unitTeam/reports?noData=true`);
      }

      // Fetch data from MongoDB with only selected fields
      const residents = await Resident.find(
        { facility: facility, isActive: true },
        selectedFields.join(" ")
      )
        .sort({ lastName: 1 })
        .lean();

      if (residents.length === 0) {
        return res.redirect(`/unitTeam/reports?noData=true`);
      }

      // Convert data to CSV
      const json2csvParser = new Parser({ fields: selectedFields });
      const csv = json2csvParser.parse(residents);

      // Set response headers to trigger file download
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="resident_report.csv"'
      );
      res.setHeader("Content-Type", "text/csv");

      res.status(200).send(csv);
    } catch (err) {
      console.log(err);
      logger.warn("Error generating report: " + err);
      res.render("error/500");
    }
  },
  async employedResidentsReport(req, res) {
    try {
      const facility = req.session.user.facility;
      const selectedFields = Object.keys(req.body);

      if (selectedFields.length === 0) {
        return res.redirect(`/unitTeam/reports?noData=true`);
      }

      // Fetch data from MongoDB with only selected fields
      const residents = await Resident.find(
        { facility: facility, isHired: true, isActive: true },
        selectedFields.join(" ")
      )
        .sort({ lastName: 1 })
        .lean();

      if (residents.length === 0) {
        return res.redirect(`/unitTeam/reports?noData=true`);
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
  async applicantsReport(req, res) {
    try {
      const selectedFields = Object.keys(req.body);

      if (selectedFields.length === 0) {
        return res.redirect(`/unitTeam/reports?noData=true`);
      }

      //find caseload specific to UTM
      const caseLoad = await findUnitTeamCaseload(req.session.user.email);

      //make array of resident _id in caseload
      const IDs = caseLoad.flatMap((resident) => resident._id);

      let applicantIDs = await findApplicantIDsAndCompanyName(IDs);

      //find all residents with applications in
      const applicants = await createApplicantsReport(
        applicantIDs,
        selectedFields
      );

      if (applicants.length === 0) {
        return res.redirect(`/unitTeam/reports?noData=true`);
      }

      // Convert data to CSV
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
