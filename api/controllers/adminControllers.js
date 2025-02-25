const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const Company = require("../models/Company");
const Classification = require("../models/Classification");
const Facility_Management = require("../models/Facility_Management");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");
const ActivityLog = require("../models/ActivityLog");

const { Parser } = require("json2csv");

const logger = require("../utils/logger");

//csv file upload requirements
const fs = require("fs");
const path = require("path");
const moment = require("moment");
const csv = require("csv-parser");

const { getUserNotifications } = require("../utils/notificationUtils");

const {
  getEmployeeEmails,
  sendNotificationsToEmployers,
} = require("../utils/clearanceUtils");

const {
  getAllInterviews,
  findApplicantIDsAndCompanyName,
  createApplicantsReport,
  updateAdminPasswordById,
  updateEmployerPasswordById,
  updateUnitTeamPasswordById,
  updateClassificationPasswordById,
  updateFacility_ManagementPasswordById,
} = require("../utils/adminUtils");

const { getTotalAvailablePositions } = require("../utils/employerUtils");

const { createActivityLog } = require("../utils/activityLogUtils");

module.exports = {
  //serves admin dashboard
  async dashboard(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      //finds residents who need resumes approved
      const resumeNeedReview = await Resident.find({
        isActive: true,
        "resume.status": "pending",
      })
        .sort({ lastName: 1 })
        .lean();
      //find all residents in KDOC
      const caseLoad = await Resident.find({ isActive: true })
        .sort({ lastName: 1 })
        .lean();

      //create object with all applicants
      let applicantIDs = [];

      await Jobs.aggregate([
        { $unwind: "$applicants" }, // Flatten the applicants array
        {
          $group: {
            _id: null,
            allResidents: {
              $push: "$applicants.resident_id", // Collect resident_id from applicants, not the whole applicant object
            },
          },
        },
      ]).then((result) => {
        if (result.length !== 0) {
          return (applicantIDs = result[0].allResidents); // Return the array of resident IDs
        } else {
          return; // Return an empty array if no applicants
        }
      });

      const allJobApplicants = await Resident.find(
        { _id: { $in: applicantIDs }, isActive: true },
        "firstName lastName facility residentID custodyLevel"
      ).lean();

      res.render("admin/dashboard", {
        resumeNeedReview,
        caseLoad,
        allJobApplicants,
        user: req.session.user,
        notifications,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async analytics(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      res.render("admin/analytics", {
        user: req.session.user,
        notifications,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async employmentData(req, res) {
    try {
      const employedData = await Resident.aggregate([
        {
          $group: {
            _id: "$facility", // Group by facility
            hiredCount: {
              $sum: {
                $cond: [{ $eq: ["$isHired", true] }, 1, 0], // Count isHired: true
              },
            },
            notHiredCount: {
              $sum: {
                $cond: [{ $eq: ["$isHired", false] }, 1, 0], // Count isHired: false
              },
            },
          },
        },
        {
          $sort: { _id: 1 }, // Sort by facility (ascending order)
        },
      ]);

      // Convert the result to an object
      let formattedEmployed = employedData.reduce((acc, item) => {
        acc[item._id] = {
          hiredCount: item.hiredCount,
          notHiredCount: item.notHiredCount,
        };
        return acc;
      }, {});

      res.status(200).json(formattedEmployed);
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async chartData(req, res) {
    try {
      const summary = await Resident.aggregate([
        { $group: { _id: "$resume.status", count: { $sum: 1 } } },
      ]);

      // Format the response into a structured object
      const formattedData = {
        incomplete: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      };

      summary.forEach((item) => {
        formattedData[item._id] = item.count;
      });

      res.status(200).json(formattedData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },
  async manageWorkForce(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const companyName = req.session.user.companyName;

      //create object with all applicants
      let applicantIDs = [];

      await Jobs.aggregate([
        { $unwind: "$applicants" }, // Flatten the applicants array
        {
          $group: {
            _id: null,
            allResidents: {
              $push: "$applicants.resident_id", // Collect resident_id from applicants, not the whole applicant object
            },
          },
        },
      ]).then((result) => {
        if (result.length !== 0) {
          return (applicantIDs = result[0].allResidents); // Return the array of resident IDs
        } else {
          return; // Return an empty array if no applicants
        }
      });

      const applicants = await Resident.find(
        { _id: { $in: applicantIDs }, isActive: true },
        "firstName lastName facility residentID custodyLevel outDate"
      )
        .sort({ lastName: 1 })
        .lean();

      let interviews = await getAllInterviews();

      const employees = await Resident.find({
        isHired: true,
        isActive: true,
      })
        .sort({ lastName: 1 })
        .lean();
      const jobs = await Jobs.find({ isAvailable: true }).lean();
      let positionsAvailable = getTotalAvailablePositions(jobs);

      res.render("admin/manageWorkForce", {
        user: req.session.user,
        notifications,
        applicants,
        interviews,
        employees,
        positionsAvailable,
        jobs,
      });
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
      //find all residents who are currently incarcerated
      const caseLoad = await Resident.find({ isActive: true })
        .sort({ lastName: 1 })
        .lean();

      res.render("admin/manageClearance", {
        user: req.session.user,
        notifications,
        caseLoad,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async helpDesk(req, res) {
    const notifications = await getUserNotifications(
      req.session.user.email,
      req.session.user.role
    );
    try {
      res.render("admin/helpDesk", { user: req.session.user, notifications });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async contact(req, res) {
    const notifications = await getUserNotifications(
      req.session.user.email,
      req.session.user.role
    );
    try {
      res.render("admin/contact", { user: req.session.user, notifications });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //=============================
  //   Logging
  //=============================
  // Serves logs from the admin dashboard
  async logs(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const logFileName = `logs/${moment().format("YYYY-MM-DD")}-app.log`; // Today's log file
      const logFilePath = path.join(__dirname, "../../", logFileName);

      fs.readFile(logFilePath, "utf8", (err, data) => {
        if (err) {
          return res.render("logs", {
            user: req.session.user,
            notifications,
            logs: [`Error reading logs: ${err.message}`],
          });
        }

        const logsArray = data
          .split("\n")
          .filter((line) => line.trim() !== "") // Filter out empty lines
          .map((line) => {
            try {
              const log = JSON.parse(line);
              return {
                timestamp: log.timestamp,
                level: log.level.toUpperCase(),
                message: log.message,
              };
            } catch (parseError) {
              return {
                timestamp: "Invalid JSON",
                level: "ERROR",
                message: `Failed to parse log entry: ${line}`,
              };
            }
          });

        res.render("admin/logs", {
          user: req.session.user,
          notifications,
          logs: logsArray.reverse(), // Reverse to show latest logs first
        });
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //=============================
  //   KCI PI Roster Tables
  //=============================
  async residentTables(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const residents = await Resident.find({ isActive: true })
        .sort({ lastName: 1 })
        .lean();
      res.render("admin/tables/resident", {
        user: req.session.user,
        notifications,
        residents,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async employedResidents(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const residents = await Resident.find({
        isHired: true,
        isActive: true,
      })
        .sort({ lastName: 1 })
        .lean();
      res.render("admin/tables/hiredResidents", {
        user: req.session.user,
        notifications,
        residents,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async unitTeamTables(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const unitTeam = await UnitTeam.find().sort({ lastName: 1 }).lean();
      res.render("admin/tables/unitTeam", {
        user: req.session.user,
        notifications,
        unitTeam,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async classificationTables(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const classification = await Classification.find().lean();
      res.render("admin/tables/classification", {
        user: req.session.user,
        notifications,
        classification,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async facility_managementTables(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const facility_management = await Facility_Management.find().lean();
      res.render("admin/tables/facility_management", {
        user: req.session.user,
        notifications,
        facility_management,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async employerTables(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const employers = await Employer.find().sort({ lastName: 1 }).lean();
      res.render("admin/tables/employer", {
        user: req.session.user,
        notifications,
        employers,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async companyTables(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const companies = await Company.find().sort({ companyName: 1 }).lean();
      res.render("admin/tables/company", {
        user: req.session.user,
        notifications,
        companies,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //=============================
  //   Profile Routes
  //=============================
  async employerProfile(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { id } = req.params;
      const employer = await Employer.findById(id).lean();

      const activities = await ActivityLog.find({ userID: id })
        .sort({ timestamp: -1 })
        .limit(30)
        .lean();

      const activeTab = "overview";
      res.render("admin/profiles/employerProfile", {
        user: req.session.user,
        notifications,
        employer,
        activeTab,
        activities,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async unitTeamProfile(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { id } = req.params;
      const unitTeam = await UnitTeam.findById(id).lean();

      const activities = await ActivityLog.find({ userID: id })
        .sort({ timestamp: -1 })
        .limit(30)
        .lean();

      const activeTab = "overview";
      res.render("admin/profiles/unitTeamProfile", {
        user: req.session.user,
        notifications,
        unitTeam,
        activeTab,
        activities,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async classificationProfile(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { id } = req.params;
      const classification = await Classification.findById(id).lean();

      const activities = await ActivityLog.find({ userID: id })
        .sort({ timestamp: -1 })
        .limit(30)
        .lean();

      const activeTab = "overview";
      res.render("admin/profiles/classificationProfile", {
        user: req.session.user,
        notifications,
        classification,
        activeTab,
        activities,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async facility_managementProfile(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { id } = req.params;
      const facility_management = await Facility_Management.findById(id).lean();

      const activities = await ActivityLog.find({ userID: id })
        .sort({ timestamp: -1 })
        .limit(30)
        .lean();

      const activeTab = "overview";
      res.render("admin/profiles/facility_managementProfile", {
        user: req.session.user,
        notifications,
        facility_management,
        activeTab,
        activities,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async adminProfile(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { id } = req.params;

      const admin = await Admin.findOne({ _id: id }).lean();

      const activities = await ActivityLog.find({ userID: id })
        .sort({ timestamp: -1 })
        .limit(30)
        .lean();

      const activeTab = "overview";
      res.render("admin/profiles/adminProfile", {
        user: req.session.user,
        notifications,
        admin,
        activeTab,
        activities,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async companyProfile(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const id = req.params.id;
      const company = await Company.findById(id).lean();
      const companyName = company.companyName;
      const positions = await Jobs.find({ companyName })
        .sort({ lastName: 1 })
        .lean();

      const activeTab = "overview";
      res.render("admin/profiles/companyProfile", {
        user: req.session.user,
        notifications,
        company,
        activeTab,
        positions,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async addNewPosition(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
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

      const company = await Company.findOne({
        companyName: companyName,
      }).lean();

      const positions = await Jobs.find({ companyID })
        .sort({ lastName: 1 })
        .lean();

      const employerEmails = await getEmployeeEmails(companyName);

      await sendNotificationsToEmployers(
        employerEmails,
        "position_created",
        `New job position created by admin.`
      );

      await createActivityLog(
        req.session.user._id.toString(),
        "added_user",
        `Added new job position for ${companyName}.`
      );

      const activeTab = "positions";
      res.render("admin/profiles/companyProfile", {
        user: req.session.user,
        notifications,
        company,
        activeTab,
        positions,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //==========================
  //   DB Routes
  //==========================

  // Company DB ==============
  async companyDB(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const companies = await Company.find().sort({ companyName: 1 }).lean();
      activeTab = "add";
      res.render("admin/db/companyDB", {
        user: req.session.user,
        notifications,
        companies,
        activeTab,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async addCompany(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const newCompany = req.body;
      const company = new Company(newCompany);
      await company.save();

      const companies = await Company.find().sort({ companyName: 1 }).lean();

      await createActivityLog(
        req.session.user._id.toString(),
        "added_user",
        `Added new company: ${companyName} to database.`
      );

      const activeTab = "add";
      const addMsg = true;
      res.render("admin/db/companyDB", {
        user: req.session.user,
        notifications,
        companies,
        activeTab,
        addMsg,
      });
    } catch (err) {
      console.log("Error in creating company: ", err);
      res.render("error/500");
    }
  },
  async searchCompanyName(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { companyID } = req.body;
      const companyFound = await Company.findById({ _id: companyID }).lean();
      const companies = await Company.find().sort({ companyName: 1 }).lean();
      activeTab = "edit";

      res.render("admin/db/companyDB", {
        user: req.session.user,
        notifications,
        companies,
        companyFound,
        activeTab,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async saveCompanyEdit(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { companyName, facility, id } = req.body;
      await Company.updateOne(
        { _id: id },
        {
          $set: {
            companyName: companyName,
            facility: facility,
          },
        }
      );

      const companies = await Company.find().sort({ companyName: 1 }).lean();

      await createActivityLog(
        req.session.user._id.toString(),
        "edited_user",
        `Edited existing company: ${companyName} in database.`
      );

      const saveMsg = true;
      activeTab = "edit";
      res.render("admin/db/companyDB", {
        user: req.session.user,
        notifications,
        companies,
        saveMsg,
        activeTab,
      });
    } catch (err) {
      console.log("Error in saving company edit: ", err);
      res.render("error/500");
    }
  },
  async deleteCompany(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { companyID } = req.params;

      await Company.deleteOne({ _id: companyID });

      const company = await Company.find().sort({ companyName: 1 }).lean();

      await createActivityLog(
        req.session.user._id.toString(),
        "deleted_user",
        `Deleted company: ${companyName} in database.`
      );

      const activeTab = "all";
      res.render("admin/db/companyDB", {
        user: req.session.user,
        notifications,
        company,
        activeTab,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //==========================
  //   Employer DB
  //==========================
  async employerDB(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const companies = await Company.find().sort({ companyName: 1 }).lean();
      const employers = await Employer.find().sort({ lastName: 1 }).lean();
      const activeTab = "add";
      res.render("admin/db/employerDB", {
        user: req.session.user,
        notifications,
        companies,
        employers,
        activeTab,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async addEmployer(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const newEmployer = req.body;
      const employer = new Employer(newEmployer);
      await employer.save();
      const companies = await Company.find().sort({ companyName: 1 }).lean();
      const employers = await Employer.find().sort({ lastName: 1 }).lean();

      await createActivityLog(
        req.session.user._id.toString(),
        "added_user",
        `Added new employer: ${req.body.email} to database.`
      );

      const activeTab = "add";
      const addMsg = true;
      res.render("admin/db/employerDB", {
        user: req.session.user,
        notifications,
        companies,
        employers,
        activeTab,
        addMsg,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async searchEmployerName(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { employerID } = req.body;
      const employerFound = await Employer.findById({
        _id: employerID,
      }).lean();
      const companies = await Company.find().sort({ companyName: 1 }).lean();
      const employers = await Employer.find().sort({ lastName: 1 }).lean();
      const activeTab = "edit";
      res.render("admin/db/employerDB", {
        user: req.session.user,
        notifications,
        employerFound,
        companies,
        employers,
        activeTab,
      });
    } catch (err) {
      console.log("Error found when search employer name: ", err);
      res.render("error/500");
    }
  },
  async saveEmployerEdit(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { id, companyName, firstName, lastName, email, facility } =
        req.body;

      await Employer.updateOne(
        { _id: id },
        {
          $set: {
            firstName: firstName,
            lastName: lastName,
            email: email,
            companyName: companyName,
            facility: facility,
          },
        }
      );

      const companies = await Company.find().sort({ companyName: 1 }).lean();

      await createActivityLog(
        req.session.user._id.toString(),
        "edited_user",
        `Edited PI Employer: ${req.body.email} in database.`
      );

      const saveMsg = true;
      activeTab = "edit";
      res.render("admin/db/employerDB", {
        user: req.session.user,
        notifications,
        companies,
        saveMsg,
        activeTab,
      });
    } catch (err) {
      console.log("Error in saving company edit: ", err);
      res.render("error/500");
    }
  },
  async deleteEmployer(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { employerID } = req.params;
      await Employer.deleteOne({ _id: employerID });

      const employer = await Employer.find().sort({ lastName: 1 }).lean();

      await createActivityLog(
        req.session.user._id.toString(),
        "deleted_user",
        `Deleted PI Employer #${employerID} in database.`
      );

      const activeTab = "all";
      res.render("admin/db/employerDB", {
        user: req.session.user,
        notifications,
        employer,
        activeTab,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async resetEmployerPassword(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { password, confirmPassword } = req.body;
      const { employerID } = req.params;

      //if passwords match
      if (password === confirmPassword) {
        await updateEmployerPasswordById(employerID, password);
        const saved = true;
        const employer = await Employer.find().sort({ lastName: 1 }).lean();
        const employerFound = await Employer.findById({
          _id: employerID,
        }).lean();

        await createActivityLog(
          req.session.user._id.toString(),
          "changed_password",
          `Changed PI Employer password: ${employerFound.firstName} ${employerFound.lastName}.`
        );

        const activeTab = "edit";
        return res.render("admin/db/employerDB", {
          user: req.session.user,
          notifications,
          employer,
          activeTab,
          saved,
          employerFound,
        });
      }
      const employerFound = await Employer.findById({
        _id: employerID,
      }).lean();

      const employer = await Employer.find().sort({ lastName: 1 }).lean();

      const activeTab = "edit";
      const savingError = true;
      res.render("admin/db/employerDB", {
        user: req.session.user,
        notifications,
        employer,
        activeTab,
        savingError,
        employerFound,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //==========================
  //   Resident DB
  //==========================
  async residentDB(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const residents = await Resident.find({ isActive: true })
        .sort({ lastName: 1 })
        .lean();
      const activeTab = "add";
      res.render("admin/db/residentDB", {
        user: req.session.user,
        notifications,
        activeTab,
        residents,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async addResident(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const newResidentData = req.body;
      const newResident = new Resident(newResidentData);
      await newResident.save();

      const residents = await Resident.find({ isActive: true })
        .sort({ lastName: 1 })
        .lean();

      await createActivityLog(
        req.session.user._id.toString(),
        "added_user",
        `Added new resident #${req.body.residentID} to database.`
      );

      const activeTab = "add";
      const addMsg = true;
      res.render("admin/db/residentDB", {
        user: req.session.user,
        notifications,
        activeTab,
        addMsg,
        residents,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async searchResidentID(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { residentID } = req.body;
      const residentFound = await Resident.findOne({ residentID }).lean();

      if (residentFound) {
        const unitTeam = await UnitTeam.find({
          facility: residentFound.facility,
        })
          .sort({ lastName: 1 })
          .lean();
        if (unitTeam.length === 0) {
          unitTeam = null;
        }

        const residents = await Resident.find({ isActive: true })
          .sort({ lastName: 1 })
          .lean();

        const activeTab = "edit";
        res.render("admin/db/residentDB", {
          user: req.session.user,
          notifications,
          residentFound,
          unitTeam,
          activeTab,
          residents,
        });
      } else {
        const residents = await Resident.find({ isActive: true })
          .sort({ lastName: 1 })
          .lean();

        const activeTab = "edit";
        const failedSearch = true;
        res.render("admin/db/residentDB", {
          user: req.session.user,
          notifications,
          failedSearch,
          activeTab,
          residents,
        });
      }
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async editExistingResident(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const {
        residentID,
        firstName,
        lastName,
        facility,
        custodyLevel,
        unitTeam,
      } = req.body;
      await Resident.findOneAndUpdate(
        {
          residentID,
        },
        {
          $set: {
            firstName,
            lastName,
            residentID,
            custodyLevel,
            unitTeam,
            facility,
          },
        }
      );
      const resident = await Resident.findOne({ residentID }).lean();

      const residents = await Resident.find({ isActive: true })
        .sort({ lastName: 1 })
        .lean();

      await createActivityLog(
        req.session.user._id.toString(),
        "edited_user",
        `Edited resident #${residentID}.`
      );

      const activeTab = "edit";
      const saveMsg = true;
      res.render("admin/db/residentDB", {
        user: req.session.user,
        notifications,
        resident,
        saveMsg,
        activeTab,
        residents,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //==========================
  //   Unit Team DB
  //==========================
  async unitTeamDB(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const unitTeam = await UnitTeam.find().sort({ lastName: 1 }).lean();
      const activeTab = "add";
      res.render("admin/db/unitTeamDB", {
        user: req.session.user,
        notifications,
        activeTab,
        unitTeam,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async searchUnitTeamName(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { unitTeamID } = req.body;
      const unitTeamFound = await UnitTeam.findById({
        _id: unitTeamID,
      }).lean();

      const unitTeam = await UnitTeam.find().sort({ lastName: 1 }).lean();
      const activeTab = "edit";
      res.render("admin/db/unitTeamDB", {
        user: req.session.user,
        notifications,
        unitTeamFound,
        unitTeam,
        activeTab,
      });
    } catch (err) {
      console.log("Error found when search unitTeam name: ", err);
      res.render("error/500");
    }
  },
  async addUnitTeam(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const newUnitTeam = req.body;
      const newMember = new UnitTeam(newUnitTeam);
      await newMember.save();

      const unitTeam = await UnitTeam.find().sort({ unitTeamName: 1 }).lean();

      await createActivityLog(
        req.session.user._id.toString(),
        "added_user",
        `Added new Unit Team Member to database: ${req.body.email}.`
      );

      const activeTab = "add";
      const addMsg = true;
      res.render("admin/db/unitTeamDB", {
        user: req.session.user,
        notifications,
        unitTeam,
        activeTab,
        addMsg,
      });
    } catch (err) {
      console.log("Error in creating unitTeam: ", err);
      res.render("error/500");
    }
  },
  async saveUnitTeamEdit(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { firstName, lastName, email, facility, id } = req.body;

      await UnitTeam.updateOne(
        { _id: id },
        {
          $set: {
            firstName: firstName,
            lastName: lastName,
            email: email,
            facility: facility,
          },
        }
      );

      const unitTeam = await UnitTeam.find().sort({ lastName: 1 }).lean();

      await createActivityLog(
        req.session.user._id.toString(),
        "edited_user",
        `Edited Unit Team Member in database: ${email}.`
      );

      const saveMsg = true;
      activeTab = "edit";
      res.render("admin/db/unitTeamDB", {
        user: req.session.user,
        notifications,
        unitTeam,
        saveMsg,
        activeTab,
      });
    } catch (err) {
      console.log("Error in saving unit team edit: ", err);
      res.render("error/500");
    }
  },
  async deleteUnitTeam(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { unitTeamID } = req.params;
      await UnitTeam.deleteOne({ _id: unitTeamID });

      const unitTeam = await UnitTeam.find().sort({ lastName: 1 }).lean();

      await createActivityLog(
        req.session.user._id.toString(),
        "deleted_user",
        `Deleted Unit Team Member in database: ${email}.`
      );

      const activeTab = "all";
      res.render("admin/db/unitTeamDB", {
        user: req.session.user,
        notifications,
        unitTeam,
        activeTab,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async resetUnitTeamPassword(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { password, confirmPassword } = req.body;
      const { unitTeamID } = req.params;

      //if password matches
      if (password === confirmPassword) {
        await updateUnitTeamPasswordById(unitTeamID, password);
        const saved = true;
        const unitTeam = await UnitTeam.find().sort({ lastName: 1 }).lean();
        const unitTeamFound = await UnitTeam.findById({
          _id: unitTeamID,
        }).lean();

        await createActivityLog(
          req.session.user._id.toString(),
          "changed_password",
          `Changed password for Unit Team Member: ${email}.`
        );

        const activeTab = "edit";
        return res.render("admin/db/unitTeamDB", {
          user: req.session.user,
          notifications,
          unitTeam,
          activeTab,
          saved,
          unitTeamFound,
        });
      }
      const unitTeamFound = await UnitTeam.findById({
        _id: unitTeamID,
      }).lean();
      const savingError = true;
      const unitTeam = await UnitTeam.find().sort({ lastName: 1 }).lean();

      const activeTab = "edit";
      res.render("admin/db/unitTeamDB", {
        user: req.session.user,
        notifications,
        unitTeam,
        activeTab,
        savingError,
        unitTeamFound,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //==========================
  //   Admin DB
  //==========================
  async adminDB(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const admin = await Admin.find().sort({ lastName: 1 }).lean();
      const activeTab = "add";
      res.render("admin/db/adminDB", {
        user: req.session.user,
        notifications,
        activeTab,
        admin,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async searchAdminName(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { adminID } = req.body;
      const adminFound = await Admin.findById({
        _id: adminID,
      }).lean();

      const admin = await Admin.find().sort({ lastName: 1 }).lean();
      const activeTab = "edit";
      res.render("admin/db/adminDB", {
        user: req.session.user,
        notifications,
        adminFound,
        admin,
        activeTab,
      });
    } catch (err) {
      console.log("Error found when search admin name: ", err);
      res.render("error/500");
    }
  },
  async addAdmin(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const newAdmin = req.body;
      const newMember = new Admin(newAdmin);
      await newMember.save();

      const admin = await Admin.find().sort({ lastName: 1 }).lean();

      await createActivityLog(
        req.session.user._id.toString(),
        "added_user",
        `Added new admin: ${req.body.email} to database.`
      );

      const activeTab = "add";
      const addMsg = true;
      res.render("admin/db/adminDB", {
        user: req.session.user,
        notifications,
        admin,
        activeTab,
        addMsg,
      });
    } catch (err) {
      console.log("Error in creating admin: ", err);
      res.render("error/500");
    }
  },
  async saveAdminEdit(req, res) {
    const notifications = await getUserNotifications(
      req.session.user.email,
      req.session.user.role
    );
    try {
      const { firstName, lastName, email, facility, id } = req.body;

      await Admin.updateOne(
        { _id: id },
        {
          $set: {
            firstName: firstName,
            lastName: lastName,
            email: email,
            facility: facility,
          },
        }
      );

      const admin = await Admin.find().sort({ lastName: 1 }).lean();

      await createActivityLog(
        req.session.user._id.toString(),
        "edited_user",
        `Edited admin: ${email} in database.`
      );

      const saveMsg = true;
      activeTab = "edit";
      res.render("admin/db/adminDB", {
        user: req.session.user,
        notifications,
        admin,
        saveMsg,
        activeTab,
      });
    } catch (err) {
      console.log("Error in saving unit team edit: ", err);
      res.render("error/500");
    }
  },
  async deleteAdmin(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { adminID } = req.params;
      await Admin.deleteOne({ _id: adminID });

      const admin = await Admin.find().sort({ lastName: 1 }).lean();

      await createActivityLog(
        req.session.user._id.toString(),
        "deleted_user",
        `Deleted admin: ${req.body.email} in database.`
      );

      const activeTab = "all";
      res.render("admin/db/adminDB", {
        user: req.session.user,
        notifications,
        admin,
        activeTab,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async resetAdminPassword(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { password, confirmPassword } = req.body;
      const { adminID } = req.params;

      if (password == confirmPassword) {
        await updateAdminPasswordById(adminID, password);
        const saved = true;
        const admin = await Admin.find().sort({ lastName: 1 }).lean();
        const adminFound = await Admin.findById({
          _id: adminID,
        }).lean();

        await createActivityLog(
          req.session.user._id.toString(),
          "changed_password",
          `Changed password for admin: ${req.body.email}.`
        );

        const activeTab = "edit";
        return res.render("admin/db/adminDB", {
          user: req.session.user,
          notifications,
          admin,
          activeTab,
          saved,
          adminFound,
        });
      }
      const adminFound = await Admin.findById({
        _id: adminID,
      }).lean();
      const savingError = true;
      const admin = await Admin.find().sort({ lastName: 1 }).lean();

      const activeTab = "edit";
      res.render("admin/db/adminDB", {
        user: req.session.user,
        notifications,
        admin,
        activeTab,
        savingError,
        adminFound,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //==========================
  //  Classification DB
  //==========================
  async classificationDB(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const classification = await Classification.find()
        .sort({ lastName: 1 })
        .lean();
      const activeTab = "add";
      res.render("admin/db/classificationDB", {
        user: req.session.user,
        notifications,
        activeTab,
        classification,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async searchClassificationName(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { classificationID } = req.body;
      const classificationFound = await Classification.findById({
        _id: classificationID,
      }).lean();

      const classification = await Classification.find()
        .sort({ lastName: 1 })
        .lean();

      const activeTab = "edit";
      res.render("admin/db/classificationDB", {
        user: req.session.user,
        notifications,
        classificationFound,
        classification,
        activeTab,
      });
    } catch (err) {
      console.log("Error found when search classification name: ", err);
      res.render("error/500");
    }
  },
  async addClassification(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const newClassification = req.body;
      const newMember = new Classification(newClassification);
      await newMember.save();

      const classification = await Classification.find()
        .sort({ lastName: 1 })
        .lean();

      await createActivityLog(
        req.session.user._id.toString(),
        "added_user",
        `Added new classification member: ${req.body.email} to database.`
      );

      const activeTab = "add";
      const addMsg = true;
      res.render("admin/db/classificationDB", {
        user: req.session.user,
        notifications,
        classification,
        activeTab,
        addMsg,
      });
    } catch (err) {
      console.log("Error in creating classification: ", err);
      res.render("error/500");
    }
  },
  async saveClassificationEdit(req, res) {
    const notifications = await getUserNotifications(
      req.session.user.email,
      req.session.user.role
    );
    try {
      const { firstName, lastName, email, facility, id } = req.body;

      await Classification.updateOne(
        { _id: id },
        {
          $set: {
            firstName: firstName,
            lastName: lastName,
            email: email,
            facility: facility,
          },
        }
      );

      const classification = await Classification.find()
        .sort({ lastName: 1 })
        .lean();

      await createActivityLog(
        req.session.user._id.toString(),
        "edited_user",
        `Edited classification member: ${email} in database.`
      );

      const saveMsg = true;
      activeTab = "edit";
      res.render("admin/db/classificationDB", {
        user: req.session.user,
        notifications,
        classification,
        saveMsg,
        activeTab,
      });
    } catch (err) {
      console.log("Error in saving unit team edit: ", err);
      res.render("error/500");
    }
  },
  async deleteClassification(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { classificationID } = req.params;
      await Classification.deleteOne({ _id: classificationID });

      const classification = await Classification.find()
        .sort({ lastName: 1 })
        .lean();

      await createActivityLog(
        req.session.user._id.toString(),
        "deleted_user",
        `Deleted classification member in database.`
      );

      const activeTab = "all";
      res.render("admin/db/classificationDB", {
        user: req.session.user,
        notifications,
        classification,
        activeTab,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async resetClassificationPassword(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { password, confirmPassword } = req.body;
      const { classificationID } = req.params;

      if (password == confirmPassword) {
        await updateClassificationPasswordById(classificationID, password);
        const saved = true;
        const classification = await Classification.find()
          .sort({ lastName: 1 })
          .lean();
        const classificationFound = await Classification.findById({
          _id: classificationID,
        }).lean();

        await createActivityLog(
          req.session.user._id.toString(),
          "changed_password",
          `Changed password for classification member.`
        );

        const activeTab = "edit";
        return res.render("admin/db/classificationDB", {
          user: req.session.user,
          notifications,
          classification,
          activeTab,
          saved,
          classificationFound,
        });
      }
      const classificationFound = await Classification.findById({
        _id: classificationID,
      }).lean();
      const savingError = true;
      const classification = await Classification.find()
        .sort({ lastName: 1 })
        .lean();

      const activeTab = "edit";
      res.render("admin/db/classificationDB", {
        user: req.session.user,
        notifications,
        classification,
        activeTab,
        savingError,
        classificationFound,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //==========================
  //  Facility_Management DB
  //==========================
  async facility_managementDB(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const facility_management = await Facility_Management.find()
        .sort({ lastName: 1 })
        .lean();
      const activeTab = "add";
      res.render("admin/db/facility_managementDB", {
        user: req.session.user,
        notifications,
        activeTab,
        facility_management,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async searchFacility_ManagementName(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { facility_managementID } = req.body;
      const facility_managementFound = await Facility_Management.findById({
        _id: facility_managementID,
      }).lean();

      const facility_management = await Facility_Management.find()
        .sort({ lastName: 1 })
        .lean();
      const activeTab = "edit";
      res.render("admin/db/facility_managementDB", {
        user: req.session.user,
        notifications,
        facility_managementFound,
        facility_management,
        activeTab,
      });
    } catch (err) {
      console.log("Error found when search facility_management name: ", err);
      res.render("error/500");
    }
  },
  async addFacility_Management(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const newFacility_Management = req.body;
      const newMember = new Facility_Management(newFacility_Management);
      await newMember.save();

      const facility_management = await Facility_Management.find()
        .sort({ lastName: 1 })
        .lean();

      await createActivityLog(
        req.session.user._id.toString(),
        "added_user",
        `Added new Facility Management: ${req.body.email}.`
      );

      const activeTab = "add";
      const addMsg = true;
      res.render("admin/db/facility_managementDB", {
        user: req.session.user,
        notifications,
        facility_management,
        activeTab,
        addMsg,
      });
    } catch (err) {
      console.log("Error in creating facility_management: ", err);
      res.render("error/500");
    }
  },
  async saveFacility_ManagementEdit(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { firstName, lastName, email, facility, id } = req.body;

      await Facility_Management.updateOne(
        { _id: id },
        {
          $set: {
            firstName: firstName,
            lastName: lastName,
            email: email,
            facility: facility,
          },
        }
      );

      const facility_management = await Facility_Management.find()
        .sort({ lastName: 1 })
        .lean();

      await createActivityLog(
        req.session.user._id.toString(),
        "edited_user",
        `Edited Facility Management: ${email} in database.`
      );

      const saveMsg = true;
      activeTab = "edit";
      res.render("admin/db/facility_managementDB", {
        user: req.session.user,
        notifications,
        facility_management,
        saveMsg,
        activeTab,
      });
    } catch (err) {
      console.log("Error in saving unit team edit: ", err);
      res.render("error/500");
    }
  },
  async deleteFacility_Management(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { facility_managementID } = req.params;
      await Facility_Management.deleteOne({ _id: facility_managementID });

      const facility_management = await Facility_Management.find()
        .sort({ lastName: 1 })
        .lean();

      await createActivityLog(
        req.session.user._id.toString(),
        "deleted_user",
        `Deleted Facility Management in database.`
      );

      const activeTab = "all";
      res.render("admin/db/facility_managementDB", {
        user: req.session.user,
        notifications,
        facility_management,
        activeTab,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async resetFacility_ManagementPassword(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { password, confirmPassword } = req.body;
      const { facility_managementID } = req.params;

      if (password == confirmPassword) {
        await updateFacility_ManagementPasswordById(
          facility_managementID,
          password
        );

        const facility_management = await Facility_Management.find()
          .sort({ lastName: 1 })
          .lean();

        const facility_managementFound = await Facility_Management.findById({
          _id: facility_managementID,
        }).lean();

        await createActivityLog(
          req.session.user._id.toString(),
          "changed_password",
          `Changed password for Facility Management member.`
        );

        const activeTab = "edit";
        const saved = true;
        return res.render("admin/db/facility_managementDB", {
          user: req.session.user,
          notifications,
          facility_management,
          activeTab,
          saved,
          facility_managementFound,
        });
      }
      const facility_managementFound = await Facility_Management.findById({
        _id: facility_managementID,
      }).lean();

      const facility_management = await Facility_Management.find()
        .sort({ lastName: 1 })
        .lean();

      const activeTab = "edit";
      const savingError = true;
      res.render("admin/db/facility_managementDB", {
        user: req.session.user,
        notifications,
        facility_management,
        activeTab,
        savingError,
        facility_managementFound,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //==========================
  //   Reports
  //==========================
  //serves reports page from admin dashboard
  async reports(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      res.render("admin/reports", { user: req.session.user, notifications });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async residentReport(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const selectedFields = Object.keys(req.body);

      if (selectedFields.length === 0) {
        const noData = true;
        return res.render("admin/reports", {
          user: req.session.user,
          notifications,
          noData,
        });
      }

      // Fetch data from MongoDB with only selected fields
      const residents = await Resident.find(
        { isActive: true },
        selectedFields.join(" ")
      )
        .sort({ lastName: 1 })
        .lean();

      if (residents.length === 0) {
        const noData = true;
        return res.render("admin/reports", {
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
        'attachment; filename="KDOC_resident_report.csv"'
      );
      res.setHeader("Content-Type", "text/csv");

      res.status(200).send(csv);
    } catch (err) {
      console.log(err);
      logger.warn("Error generating resident report: " + err);
      res.render("error/500");
    }
  },
  async employedResidentsReport(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const selectedFields = Object.keys(req.body);

      if (selectedFields.length === 0) {
        const noData = true;
        return res.render("admin/reports", {
          user: req.session.user,
          notifications,
          noData,
        });
      }

      // Fetch data from MongoDB with only selected fields
      const residents = await Resident.find(
        { isHired: true, isActive: true },
        selectedFields.join(" ")
      )
        .sort({ lastName: 1 })
        .lean();

      if (residents.length === 0) {
        const noData = true;
        return res.render("admin/reports", {
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
      logger.warn("Error generating PI Employees report: " + err);
      res.render(500);
    }
  },
  async applicantsReport(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const selectedFields = Object.keys(req.body);

      if (selectedFields.length === 0) {
        const noData = true;
        return res.render("admin/reports", {
          user: req.session.user,
          notifications,
          noData,
        });
      }

      const email = req.session.user.email;

      //find all residents who are currently incarcerated
      const caseLoad = await Resident.find({ isActive: true })
        .sort({ lastName: 1 })
        .lean();

      //make array of resident _id in caseload
      const IDs = caseLoad.flatMap((resident) => resident._id);

      let applicantIDs = await findApplicantIDsAndCompanyName(IDs);

      //find all residents with applications in
      const applicants = await createApplicantsReport(
        applicantIDs,
        selectedFields
      );

      if (applicants.length === 0) {
        const noData = true;
        return res.render("admin/reports", {
          user: req.session.user,
          notifications,
          noData,
        });
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
      logger.warn("Error generating applicants report: " + err);
      res.render(500);
    }
  },
};
