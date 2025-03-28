//database requests

const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");
const Link = require("../models/Link");
const Facility_Management = require("../models/Facility_Management");
const Classification = require("../models/Classification");

const mongoose = require("mongoose");

const {
  sendReviewEmail,
  sendHelpDeskEmail,
  sendContactEmail,
} = require("../utils/emailUtils/notificationEmail");

//===========================
//  Global   functions
//===========================

const { createNotification } = require("../utils/notificationUtils");

const { createActivityLog } = require("../utils/activityLogUtils");

const { getNameFromEmail, isValidUser } = require("../utils/requestUtils");

const { mapDepartmentName } = require("../utils/requestUtils.js");

module.exports = {
  //===========================
  //     Clearance Requests
  //===========================

  async reviewClearance(req, res) {
    let { activeTab } = req.query;
    let { residentID, email, deptName } = req.params;
    const { token } = req.query;

    const session = await mongoose.startSession(); // Start a session
    session.startTransaction(); // Start the transaction

    try {
      const validUser = await isValidUser(token);

      if (!validUser) return res.render("error/410");

      const dept = mapDepartmentName(deptName);

      // Fetch resident with session for atomicity
      const resident = await Resident.findOne({ residentID })
        .session(session)
        .lean();

      // Check if resident exists
      if (!resident) {
        return res.render("error/residentError/404");
      }

      // Sort notes based on creation date
      const notes = resident[`${dept}Clearance`].notes.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      const clearanceStatus = resident[`${dept}Clearance`].status;

      // Store token in session
      req.session.token = token;

      if (!activeTab) activeTab = "status";

      // Commit the transaction after all operations
      await session.commitTransaction();

      res.render(`clearance/reviewClearance`, {
        token: req.session.token,
        resident,
        email,
        activeTab,
        dept,
        deptName,
        clearanceStatus,
        notes,
      });
    } catch (err) {
      // Rollback the transaction if there is an error
      await session.abortTransaction();
      console.log(err);
      res.render("error/residentError/500");
    } finally {
      // End the session, whether successful or not
      session.endSession();
    }
  },
  async approveClearance(req, res) {
    const { residentID, email, deptName } = req.params;
    const token = req.session.token;
    console.log("approveClearance has been called");

    const session = await mongoose.startSession(); // Start a session
    session.startTransaction(); // Start the transaction

    try {
      const dept = mapDepartmentName(deptName);

      // Create activity log if the user belongs to the database
      if (dept === "DW" || dept === "Warden" || dept === "Classification") {
        let user = await Facility_Management.findOne({ email })
          .session(session)
          .lean();

        if (!user) {
          user = await Classification.findOne({ email })
            .session(session)
            .lean();
        }

        if (user) {
          await createActivityLog(
            user._id.toString(),
            "clearance_approved",
            `Approved ${dept} clearance for resident #${residentID}.`,
            session
          );
        }
      }

      // Update the clearance status and history for the specific department
      const resident = await Resident.findOneAndUpdate(
        { residentID: residentID },
        {
          $set: {
            [`${dept}Clearance.status`]: "approved",
          },
          $push: {
            [`${dept}Clearance.clearanceHistory`]: {
              action: "approved",
              performedBy: email,
              reason: "Clearance approved. ✅",
            },
            [`${dept}Clearance.notes`]: {
              createdAt: new Date(),
              createdBy: email,
              note: `Approved clearance. ✅`,
            },
          },
        },
        { new: true, session } // Pass the session for atomic operation
      ).lean();

      // Send notification to unit team
      await createNotification(
        resident.resume.unitTeam,
        "unitTeam",
        "clearance_approved",
        `${deptName} clearance approved for resident #${residentID} by ${email}.`,
        `/shared/residentProfile/${resident.residentID}?activeTab=clearance`,
        session
      );

      // Commit the transaction after all operations
      await session.commitTransaction();

      // Redirect after successful operation
      res.redirect(
        `/request/reviewClearance/${deptName}/${residentID}/${email}?token=${token}&activeTab=status`
      );
    } catch (err) {
      // Rollback the transaction if there is an error
      await session.abortTransaction();
      console.error("Error approving clearance from email link:", err);
      res.render("error/residentError/500");
    } finally {
      // End the session, whether successful or not
      session.endSession();
    }
  },
  async restrictClearance(req, res) {
    console.log("restrictClearance has been called");

    let { residentID, email, deptName } = req.params;
    const token = req.session.token;

    const session = await mongoose.startSession(); // Start a session
    session.startTransaction(); // Start the transaction

    try {
      const dept = mapDepartmentName(deptName);

      // Update the clearance status and history for the specific department
      const resident = await Resident.findOneAndUpdate(
        { residentID: residentID },
        {
          $set: {
            [`${dept}Clearance.status`]: "restricted",
            "workEligibility.status": "restricted",
          },
          $push: {
            [`${dept}Clearance.clearanceHistory`]: {
              action: "restricted",
              performedBy: email,
              reason: "Restrictions added. ❌",
            },
            [`${dept}Clearance.notes`]: {
              createdAt: new Date(),
              createdBy: email,
              note: `Restricted clearance. ❌`,
            },
          },
        },
        { new: true, session } // Pass the session for atomic operation
      ).lean();

      // Send notification to unit team
      await createNotification(
        resident.resume.unitTeam,
        "unitTeam",
        "clearance_denied",
        `${deptName} clearance restricted for resident #${resident.residentID} by ${email}.`,
        `/shared/residentProfile/${resident.residentID}?activeTab=clearance`,
        session
      );

      // Create activity if user belongs to database
      if (dept === "DW" || dept === "Warden" || dept === "Classification") {
        let user = await Facility_Management.findOne({ email })
          .session(session)
          .lean();

        if (!user) {
          user = await Classification.findOne({ email })
            .session(session)
            .lean();
        }
        if (user) {
          await createActivityLog(
            user._id.toString(),
            "clearance_restricted",
            `Restricted ${deptName} clearance for resident #${residentID}.`,
            session // Ensure this operation is part of the transaction
          );
        }
      }

      // Commit the transaction after all operations
      await session.commitTransaction();

      // Redirect after successful operation
      res.redirect(
        `/request/reviewClearance/${deptName}/${residentID}/${email}?token=${token}&activeTab=status`
      );
    } catch (err) {
      // Rollback the transaction if there is an error
      await session.abortTransaction();
      console.error("Error restricting clearance:", err);
      res.render("error/residentError/500");
    } finally {
      // End the session, whether successful or not
      session.endSession();
    }
  },
  async saveNotes(req, res) {
    let { residentID, email, deptName } = req.params;
    const { notes } = req.body;
    const token = req.session.token;
    try {
      const name = getNameFromEmail(email);
      const dept = mapDepartmentName(deptName);

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
        `/request/reviewClearance/${deptName}/${residentID}/${email}?token=${token}&activeTab=notes`
      );
    } catch (err) {
      console.log(err);
      res.render("error/residentError/500");
    }
  },
  async next(req, res) {
    const { residentID, email, deptName, activeTab } = req.params;
    const token = req.session.token;
    try {
      res.redirect(
        `/request/reviewClearance/${deptName}/${residentID}/${email}?token=${token}&activeTab=${activeTab}`
      );
    } catch (err) {
      console.log(err);
      res.render("error/residentError/500");
    }
  },

  async sendNextNotification(req, res) {
    const { residentID, email } = req.params;
    let { deptName, recipientEmail, comments } = req.body;
    const token = req.session.token;

    try {
      const resident = await Resident.findOne({ residentID }).lean();

      const dept = mapDepartmentName(deptName);

      //send notification to facility_management
      if (dept == "DW" || dept == "Warden") {
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
        await createNotification(
          recipientEmail,
          "classification",
          "clearance_requested",
          `Clearance is requested for resident #${residentID}.`,
          `/shared/residentProfile/${resident.residentID}?activeTab=clearance`
        );
      }
      sendReviewEmail(
        resident,
        deptName,
        recipientEmail,
        email,
        comments,
        `request/reviewClearance/${deptName}/${residentID}/${recipientEmail}`
      );

      //delete the token here
      const linkData = await Link.findOne({ token: token });
      // Delete the link after it has been used
      if (linkData) await linkData.deleteOne();

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
      res.redirect(`/shared/helpDesk?sentMsg=true`);
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

      res.redirect(`/shared/contact?sentMsg=true`);
    } catch (err) {
      res.render("error/residentError/500");
    }
  },
  //========================
  //   Thank you
  //========================
  async thankYou(req, res) {
    const token = req.session.token;
    try {
      //delete the token here
      const linkData = await Link.findOne({ token: token });
      // Delete the link after it has been used
      if (linkData) await linkData.deleteOne();
      res.render("clearance/thankYou");
    } catch (err) {
      res.render("error/residentError/500");
    }
  },
};
