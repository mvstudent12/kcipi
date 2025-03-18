const Employer = require("../models/Employer");
const Classification = require("../models/Classification");
const Facility_Management = require("../models/Facility_Management");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");
const ActivityLog = require("../models/ActivityLog");

const mongoose = require("mongoose");

const logger = require("../utils/logger");

const { checkClearanceStatus } = require("../utils/clearanceUtils");

const { getUserNotifications } = require("../utils/notificationUtils");

const { validateResidentID } = require("../utils/validationUtils");

module.exports = {
  async residentProfile(req, res) {
    const { residentID } = req.params;
    let { activeTab } = req.query;

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );

      validateResidentID(residentID);

      //find resident workStatus
      const workStatus = await checkClearanceStatus(residentID);

      //update resident workstatus and return resident
      const resident = await Resident.findOneAndUpdate(
        { residentID },
        {
          $set: {
            "workEligibility.status": workStatus,
          },
        },
        { new: true, session }
      ).lean();

      const res_id = resident._id;

      // fetch positions the resident has applied for
      const jobs = await Jobs.find(
        { "applicants.resident_id": res_id }, // Match applicants by resident ID in the applicants array
        { "applicants.$": 1, companyName: 1, pay: 1 }
      )
        .session(session)
        .lean();

      //fetch resident applications
      const applications = jobs.flatMap((job) =>
        job.applicants.map((applicant) => ({
          ...applicant,
          companyName: job.companyName, // Attach companyName to each applicant
        }))
      );

      // Fetch the unit team, sorted by firstName
      const unitTeam = await UnitTeam.find({ facility: resident.facility })
        .sort({ firstName: 1 })
        .session(session)
        .lean();

      //fetch resident activities
      const activities = await ActivityLog.find({ userID: res_id.toString() })
        .sort({ timestamp: -1 })
        .limit(20)
        .session(session)
        .lean();

      //fetch emails attached to resident's facility

      const classificationEmails = await Classification.find({
        facility: resident.facility,
      })
        .session(session)
        .lean();

      const facility_managementEmails = await Facility_Management.find({
        facility: resident.facility,
      })
        .session(session)
        .lean();

      await session.commitTransaction();

      if (!activeTab) activeTab = "overview";
      res.render(`shared/residentProfile`, {
        user: req.session.user,
        notifications,
        resident,
        applications,
        activeTab,
        unitTeam,
        activities,
        classificationEmails,
        facility_managementEmails,
      });
    } catch (err) {
      // Rollback the transaction if there is an error
      await session.abortTransaction();
      console.error("Error fetching resident profile:", err);
      res.render("error/403");
    } finally {
      // End the session, whether successful or not
      session.endSession();
    }
  },
  async recentActivities(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const id = req.session.user._id.toString();

      const activities = await ActivityLog.find({ userID: id })
        .sort({ timestamp: -1 })
        .limit(20)
        .lean();

      res.render(`shared/recentActivities`, {
        user: req.session.user,
        notifications,
        activities,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async helpDesk(req, res) {
    const { sentMsg } = req.query;
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      res.render(`shared/helpDesk`, {
        user: req.session.user,
        notifications,
        sentMsg,
      });
    } catch (err) {
      console.log("Error fetching help desk:", err);
      res.render("error/403");
    }
  },
  async contact(req, res) {
    const { sentMsg } = req.query;
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      res.render(`shared/contact`, {
        user: req.session.user,
        notifications,
        sentMsg,
      });
    } catch (err) {
      console.log("Error fetching contact page:", err);
      res.render("error/403");
    }
  },
};
