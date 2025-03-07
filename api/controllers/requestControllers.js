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
  checkClearanceStatus,
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
      res.render("error/residentError/500");
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
        `${deptName} clearance approved for resident #${residentID} by ${name}.`,
        `/shared/residentProfile/${resident.residentID}?activeTab=clearance`
      );

      const workStatus = await checkClearanceStatus(residentID);

      await Resident.findOneAndUpdate(
        { residentID },
        {
          $set: {
            "workEligibility.status": workStatus,
          },
        }
      );

      res.redirect(
        `/request/reviewClearance/${dept}/${residentID}/${email}?activeTab=status`
      );
    } catch (err) {
      console.log("Error approving clearance from email link: ", err);
      res.render("error/residentError/500");
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
        `${deptName} clearance restricted for resident #${resident.residentID} by ${name}.`,
        `/shared/residentProfile/${resident.residentID}?activeTab=clearance`
      );

      const workStatus = await checkClearanceStatus(residentID);

      await Resident.findOneAndUpdate(
        { residentID },
        {
          $set: {
            "workEligibility.status": workStatus,
          },
        }
      );

      res.redirect(
        `/request/reviewClearance/${dept}/${residentID}/${email}?activeTab=status`
      );
    } catch (err) {
      console.log(err);
      res.render("error/residentError/500");
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
      res.render("error/residentError/500");
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
      res.render("error/residentError/500");
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
      res.render("error/residentError/500");
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
        sendReviewEmail(resident, department, recipient, sender, comments, ``);
        await createNotification(
          recipientEmail,
          "facility_management",
          "clearance_requested",
          `Clearance is requested for resident #${residentID}.`,
          `/shared/residentProfile/${resident.residentID}?activeTab=clearance`
        );
      }
      //send notification to classification
      if (dept == "Classification") {
        sendReviewEmail(resident, department, recipient, sender, comments, ``);
        await createNotification(
          recipientEmail,
          "classification",
          "clearance_requested",
          `Clearance is requested for resident #${residentID}.`,
          `/shared/residentProfile/${resident.residentID}?activeTab=clearance`
        );
      } else {
        sendReviewEmail(
          resident,
          department,
          recipient,
          sender,
          comments,
          `request/reviewClearance/${department}/${residentID}/${recipient}`
        );
      }

      res.render("clearance/thankYou", { resident, email });
    } catch (err) {
      console.log(err);
      res.render("error/residentError/500");
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
      res.render("error/residentError/500");
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
      res.render("error/residentError/500");
    }
  },
  //========================
  //   Thank you
  //========================
  async thankYou(req, res) {
    try {
      res.render("clearance/thankYou");
    } catch (err) {
      res.render("error/residentError/500");
    }
  },
};
