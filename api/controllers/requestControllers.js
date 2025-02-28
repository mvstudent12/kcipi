//database requests

const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");

const mongoose = require("mongoose");

const logger = require("../utils/logger");

const {
  sendReviewEmail,
  sendHelpDeskEmail,
  sendContactEmail,
  sendRequestInterviewEmail,
  sendRequestHireEmail,
} = require("../utils/emailUtils/notificationEmail");

//===========================
//  Global   functions
//===========================

const {
  getUserNotifications,
  createNotification,
} = require("../utils/notificationUtils");

const {
  getEmployeeEmails,
  sendNotificationsToEmployers,
} = require("../utils/clearanceUtils");

const { createActivityLog } = require("../utils/activityLogUtils");

const { getNameFromEmail } = require("../utils/requestUtils");

const {
  mapDepartmentName,
  mapDepartmentNameReverse,
} = require("../utils/requestUtils.js");

module.exports = {
  //===========================
  //     Clearance Requests
  //===========================

  async requestClearance(req, res) {
    let { recipient, comments } = req.body;
    let { residentID, dept } = req.params;

    try {
      const sender = req.session.user.email;
      const department = dept;
      dept = mapDepartmentName(dept);
      const name = `${req.session.user.firstName} ${req.session.user.lastName}`;

      //change residents clearance status to show as pending
      const resident = await Resident.findOneAndUpdate(
        { residentID: residentID },
        {
          $set: {
            [`${dept}Clearance.status`]: "pending",
          },
          $push: {
            [`${dept}Clearance.notes`]: {
              createdAt: new Date(),
              createdBy: name,
              note: `Clearance request sent to ${recipient}.`,
            },
          },
        },
        { new: true }
      );

      sendReviewEmail(resident, department, recipient, sender, comments);
      //send notification to facility_management
      if (dept == "DW" || dept == "Warden") {
        await createNotification(
          recipient,
          "facility_management",
          "clearance_requested",
          `Clearance is requested for resident #${residentID}.`
        );
      }
      //send notifiaction to classification
      if (dept == "Classification") {
        await createNotification(
          recipient,
          "classification",
          "clearance_requested",
          `Clearance is requested for resident #${residentID}.`
        );
      }

      // Log activity
      await createActivityLog(
        req.session.user._id.toString(),
        "clearance_requested",
        `Requested ${department} clearance for #${residentID}.`
      );

      res.redirect(
        `/clearance/residentProfile/${residentID}?activeTab=clearance`
      );
    } catch (err) {
      console.log(
        "An error occurred when trying to request clearance approval via email: ",
        err
      );
      res.render("error/500");
    }
  },
  async reviewClearance(req, res) {
    let { activeTab } = req.query;
    let { residentID, email, dept } = req.params;
    try {
      dept = mapDepartmentName(dept);
      const resident = await Resident.findOne({ residentID }).lean();

      resident[`${dept}Clearance`].notes.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      if (!activeTab) activeTab = "status";
      res.render(`clearance/${dept}`, {
        resident,
        email,
        activeTab,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async approveClearance(req, res) {
    const { residentID, email, dept } = req.params;
    try {
      const deptName = mapDepartmentNameReverse(dept);
      const name = getNameFromEmail(email);

      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            [`${dept}Clearance.status`]: "approved",
          },
          $push: {
            [`${dept}Clearance.clearanceHistory`]: {
              action: "approved",
              performedBy: name,
              reason: "Clearance approved. ✅",
            },
            [`${dept}Clearance.notes`]: {
              createdAt: new Date(),
              createdBy: name,
              note: `Approved clearance. ✅`,
            },
          },
        }
      );
      const resident = await Resident.findOne({ residentID }).lean();

      //send notification to unit team
      await createNotification(
        resident.resume.unitTeam,
        "unitTeam",
        "clearance_approved",
        `${deptName} clearance approved for resident #${residentID} by ${name}.`
      );

      res.redirect(
        `/request/reviewClearance/${dept}/${residentID}/${email}?activeTab=status`
      );
    } catch (err) {
      console.log("Error approving clearance from email link: ", err);
      res.render("error/500");
    }
  },
  async restrictClearance(req, res) {
    let { residentID, email, dept } = req.params;

    try {
      const name = getNameFromEmail(email);
      const deptName = mapDepartmentNameReverse(dept);

      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            [`${dept}Clearance.status`]: "restricted",
            "workEligibility.status": "restricted",
          },
          $push: {
            [`${dept}Clearance.clearanceHistory`]: {
              action: "restricted",
              performedBy: name,
              reason: "Restrictions added. ❌",
            },
            [`${dept}Clearance.notes`]: {
              createdAt: new Date(),
              createdBy: name,
              note: `Restricted clearance. ❌`,
            },
          },
        }
      );

      const resident = await Resident.findOne({ residentID }).lean();

      //send notification to unit team
      await createNotification(
        resident.resume.unitTeam,
        "unitTeam",
        "clearance_denied",
        `${deptName} clearance restricted for resident #${resident.residentID} by ${name}.`
      );

      res.redirect(
        `/request/reviewClearance/${dept}/${residentID}/${email}?activeTab=status`
      );
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async saveNotes(req, res) {
    let { residentID, email, dept } = req.params;
    const { notes } = req.body;

    try {
      const name = getNameFromEmail(email);

      await Resident.updateOne(
        { residentID: residentID },
        {
          $push: {
            [`${dept}Clearance.notes`]: {
              createdAt: new Date(),
              createdBy: name,
              note: notes,
            },
          },
        }
      );
      res.redirect(
        `/request/reviewClearance/${dept}/${residentID}/${email}?activeTab=notes`
      );
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },

  async next_notes(req, res) {
    const { residentID, email, dept } = req.params;
    try {
      res.redirect(
        `/request/reviewClearance/${dept}/${residentID}/${email}?activeTab=notes`
      );
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async next_notify(req, res) {
    const { residentID, email, dept } = req.params;
    try {
      res.redirect(
        `/request/reviewClearance/${dept}/${residentID}/${email}?activeTab=notify`
      );
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },

  async sendNextNotification(req, res) {
    const { residentID, email } = req.params;
    let { category, recipientEmail, comments } = req.body;

    try {
      const resident = await Resident.findOne({ residentID }).lean();

      const dept = mapDepartmentName(category);

      //send notification to facility_management
      if (dept == "DW" || dept == "Warden") {
        await createNotification(
          recipientEmail,
          "facility_management",
          "clearance_requested",
          `Clearance is requested for resident #${residentID}.`
        );
      }
      //send notifiaction to classification
      if (dept == "Classification") {
        await createNotification(
          recipientEmail,
          "classification",
          "clearance_requested",
          `Clearance is requested for resident #${residentID}.`
        );
      }

      sendReviewEmail(resident, category, recipientEmail, email, comments);
      res.render("clearance/thankYou", { resident, email });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //===========================
  //     Interview Requests
  //===========================
  async reviewInterviewRequest(req, res) {
    const { interviewID } = req.params;
    try {
      let interview = await Jobs.aggregate([
        // Unwind the interviews array to make each interview a separate document
        { $unwind: "$interviews" },

        // Match the specific interview by its _id
        {
          $match: {
            "interviews._id": new mongoose.Types.ObjectId(interviewID),
          },
        },

        // Project the interview and optionally other relevant fields
        {
          $project: {
            _id: 0, // Exclude the Job document's _id
            position_id: "$_id", // Include the Job document's _id as jobID for context
            interview: "$interviews", // Include the matched interview
            companyName: "$companyName",
          },
        },
      ]);
      interview = interview[0];

      const residentID = interview.interview.residentID;
      const resident = await Resident.findOne({
        residentID: residentID,
      }).lean();
      res.render("clearance/requestInterview", {
        interview,
        resident,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  }, //schedule interview from email notification
  async scheduleInterview(req, res) {
    const { interviewID, jobID } = req.params;
    const { date, time, instructions, residentID } = req.body;
    try {
      // Convert interviewID to ObjectId
      const interviewObjectId = new mongoose.Types.ObjectId(interviewID);

      //update the interview in job
      const result = await Jobs.updateOne(
        {
          _id: jobID, // Match the job by its ID
          "interviews._id": interviewObjectId, // Match the specific interview by its _id
        },
        {
          $set: {
            "interviews.$.dateScheduled": new Date(date), // Update the date
            "interviews.$.time": time, // Update the time
            "interviews.$.instructions": instructions.trim(), // Update the instructions
          },
        }
      );

      if (result.modifiedCount === 0) {
        throw new Error(
          "Interview update failed. Ensure job and interview exist."
        );
      }
      const resident = await Resident.findOne({ residentID }).lean();
      const job = await Jobs.findOne({ _id: jobID }).lean();
      const companyName = job.companyName;

      //send notification to all PI partners in that company
      const employerEmails = await getEmployeeEmails(companyName);

      await sendNotificationsToEmployers(
        employerEmails,
        "interview_scheduled",
        `New interview scheduled for resident #${resident.residentID}.`
      );
      res.render(`clearance/thankYou`, {
        user: req.session.user,
      });
    } catch (err) {
      console.error("Error scheduling interview:", err);
      logger.warn("An error occurred while scheduling the interview: " + err);
      res.render("error/500");
    }
  },
  //===========================
  //     Hiring Requests
  //===========================
  async reviewHireRequest(req, res) {
    const { jobID, res_id } = req.params;
    try {
      let application = await Jobs.findOne(
        {
          _id: jobID, // Match the job by jobID
          "applicants.resident_id": res_id, // Match the applicant by resident_id
        },
        { "applicants.$": 1 } // Return the matched application from the applicants array
      ).lean(); // Optional, if you prefer working with a plain JavaScript object

      // If found, application will contain the job with the specific applicant data
      application = application.applicants[0];

      const job = await Jobs.findById({ _id: jobID }).lean();

      const resident = await Resident.findById({ _id: res_id }).lean();
      const email = resident.resume.unitTeam;
      const unitTeam = await UnitTeam.findOne({ email }).lean();

      req.session.user = unitTeam;

      res.render("clearance/requestHire", {
        application,
        resident,
        user: req.session.user,
        job,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //===========================
  //     Hiring Requests
  //===========================
  async reviewTerminationRequest(req, res) {
    const { res_id } = req.params;
    try {
      const resident = await Resident.findOne({ _id: res_id }).lean();
      const unitTeam = await UnitTeam.findOne({
        email: resident.resume.unitTeam,
      }).lean();

      req.session.user = unitTeam;
      res.render("clearance/requestTermination", {
        user: req.session.user,
        resident,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },

  //========================
  //   Help Desk
  //========================

  async requestHelp(req, res) {
    const { name, email, subject, message } = req.body;
    try {
      const recipient = "kcicodingdev@gmail.com"; //-->development only
      sendHelpDeskEmail(name, subject, email, message, recipient);
      res.redirect(`/${req.session.user.role}/helpDesk?sentMsg=true`);
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //========================
  //   Contact
  //========================
  async contact(req, res) {
    const { name, email, subject, message } = req.body;
    try {
      const recipient = "kcicodingdev@gmail.com"; //-->development only
      sendContactEmail(name, subject, email, message, recipient);

      res.redirect(`/${req.session.user.role}/contact?sentMsg=true`);
    } catch (err) {
      res.render("error/500");
    }
  },
  //========================
  //   Thank you
  //========================
  async thankYou(req, res) {
    try {
      res.render("clearance/thankYou");
    } catch (err) {
      res.render("error/500");
    }
  },
};
