const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");
const ActivityLog = require("../models/ActivityLog");

const mongoose = require("mongoose");

const logger = require("../utils/logger");

const {
  getEmployeeEmails,
  sendNotificationsToEmployers,
  getResidentProfileInfo,
  checkClearanceStatus,
} = require("../utils/clearanceUtils");

const {
  sendReviewEmail,
  sendHelpDeskEmail,
  sendContactEmail,
  sendRequestInterviewEmail,
  sendRequestHireEmail,
} = require("../utils/emailUtils/notificationEmail");

const {
  getUserNotifications,
  createNotification,
} = require("../utils/notificationUtils");

const { createActivityLog } = require("../utils/activityLogUtils");
const { validateResidentID } = require("../utils/validationUtils");
const { mapDepartmentName } = require("../utils/requestUtils.js");

module.exports = {
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

  async residentProfile(req, res) {
    const { residentID } = req.params;
    let { activeTab } = req.query;
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );

      validateResidentID(residentID);
      //update resident workStatus
      const workStatus = await checkClearanceStatus(residentID);

      await Resident.findOneAndUpdate(
        { residentID },
        {
          $set: {
            "workEligibility.status": workStatus,
          },
        }
      );

      const { resident, applications, unitTeam, activities } =
        await getResidentProfileInfo(residentID);

      if (!activeTab) activeTab = "overview";
      res.render(`shared/residentProfile`, {
        user: req.session.user,
        notifications,
        resident,
        applications,
        activeTab,
        unitTeam,
        activities,
      });
    } catch (err) {
      console.error("Error fetching resident profile:", err);
      res.render("error/403");
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
