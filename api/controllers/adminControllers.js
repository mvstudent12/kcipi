const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const Company = require("../models/Company");
const Classification = require("../models/Classification");
const Facility_Management = require("../models/Facility_Management");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");
const ActivityLog = require("../models/ActivityLog");
const Notification = require("../models/Notification");

const { Parser } = require("json2csv");

const logger = require("../utils/logger");

//csv file upload requirements
const fs = require("fs");
const path = require("path");
const moment = require("moment");

const {
  getEmployeeEmails,
  sendNotificationsToEmployers,
} = require("../utils/clearanceUtils");

const {
  getAllInterviews,
  updateAdminPasswordById,
  updateEmployerPasswordById,
  updateUnitTeamPasswordById,
  updateClassificationPasswordById,
  updateFacility_ManagementPasswordById,
} = require("../utils/adminUtils");

const {
  findApplicantIDsAndCompanyName,
  findResidentsWithCompany,
  createApplicantsReport,
} = require("../utils/kdocStaffUtils");

const { getTotalAvailablePositions } = require("../utils/employerUtils");

const { createActivityLog } = require("../utils/activityLogUtils");

module.exports = {
  async dashboard(req, res) {
    try {
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

      //make array of resident _id in caseload
      const IDs = caseLoad.flatMap((resident) => resident._id);

      let applicantIDs = await findApplicantIDsAndCompanyName(IDs);

      //find all residents with applications in
      const applicants = await findResidentsWithCompany(applicantIDs);

      //count pending resumes for this member
      const pendingResumes = await Resident.countDocuments({
        "resume.status": "pending",
        isActive: true,
      });

      res.render("shared/dashboard", {
        resumeNeedReview,
        caseLoad,
        applicants,
        user: req.session.user,
        pendingResumes,
      });
    } catch (err) {
      console.log("Error fetching user dashboard: ", err);
      res.render("error/403");
    }
  },
  async analytics(req, res) {
    try {
      res.render("admin/analytics", {
        user: req.session.user,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //fetch employment data for analytics page
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
      console.log("Error fetching employment data: ", err);
      res.render("error/500");
    }
  },

  async resumeData(req, res) {
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

      res.render("shared/manageWorkForceKDOC", {
        user: req.session.user,

        applicants,
        interviews,
        employees,
        positionsAvailable,
        jobs,
      });
    } catch (err) {
      console.log("Error fetching Manage Workforce page:", err);
      res.render("error/403");
    }
  },
  async manageClearance(req, res) {
    try {
      //find all residents who are currently incarcerated
      const caseLoad = await Resident.find({ isActive: true })
        .sort({ lastName: 1 })
        .lean();

      res.render("shared/manageClearanceKDOC", {
        user: req.session.user,

        caseLoad,
      });
    } catch (err) {
      console.log("Error fetching Manage Clearance page:", err);
      res.render("error/403");
    }
  },

  async logs(req, res) {
    try {
      const logFileName = `logs/${moment().format("YYYY-MM-DD")}-app.log`; // Today's log file
      const logFilePath = path.join(__dirname, "../../", logFileName);

      fs.readFile(logFilePath, "utf8", (err, data) => {
        if (err) {
          return res.render("logs", {
            user: req.session.user,

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

          logs: logsArray.reverse(), // Reverse to show latest logs first
        });
      });
    } catch (err) {
      console.log("Error fetching logs page:", err);
      res.render("error/500");
    }
  },

  //=============================
  //   KCI PI Roster Tables
  //=============================
  async residentTables(req, res) {
    try {
      const residents = await Resident.find({ isActive: true })
        .sort({ lastName: 1 })
        .lean();
      res.render("admin/tables/resident", {
        user: req.session.user,

        residents,
      });
    } catch (err) {
      console.log("Error fetching Rosters:", err);
      res.render("error/403");
    }
  },
  async employedResidents(req, res) {
    try {
      const residents = await Resident.find({
        isHired: true,
        isActive: true,
      })
        .sort({ lastName: 1 })
        .lean();
      res.render("admin/tables/hiredResidents", {
        user: req.session.user,

        residents,
      });
    } catch (err) {
      console.log("Error fetching Rosters:", err);
      res.render("error/403");
    }
  },
  async unitTeamTables(req, res) {
    try {
      const unitTeam = await UnitTeam.find().sort({ lastName: 1 }).lean();
      res.render("admin/tables/unitTeam", {
        user: req.session.user,

        unitTeam,
      });
    } catch (err) {
      console.log("Error fetching Rosters:", err);
      res.render("error/403");
    }
  },
  async classificationTables(req, res) {
    try {
      const classification = await Classification.find().lean();
      res.render("admin/tables/classification", {
        user: req.session.user,

        classification,
      });
    } catch (err) {
      console.log("Error fetching Rosters:", err);
      res.render("error/403");
    }
  },
  async facility_managementTables(req, res) {
    try {
      const facility_management = await Facility_Management.find().lean();
      res.render("admin/tables/facility_management", {
        user: req.session.user,

        facility_management,
      });
    } catch (err) {
      console.log("Error fetching Rosters:", err);
      res.render("error/403");
    }
  },
  async employerTables(req, res) {
    try {
      const employers = await Employer.find().sort({ lastName: 1 }).lean();
      res.render("admin/tables/employer", {
        user: req.session.user,

        employers,
      });
    } catch (err) {
      console.log("Error fetching Rosters:", err);
      res.render("error/403");
    }
  },
  async companyTables(req, res) {
    try {
      const companies = await Company.find().sort({ companyName: 1 }).lean();
      res.render("admin/tables/company", {
        user: req.session.user,

        companies,
      });
    } catch (err) {
      console.log("Error fetching Rosters:", err);
      res.render("error/403");
    }
  },
  //=============================
  //   Profile Routes
  //=============================
  async employerProfile(req, res) {
    try {
      const { id } = req.params;
      const employer = await Employer.findById(id).lean();

      const activities = await ActivityLog.find({ userID: id })
        .sort({ timestamp: -1 })
        .limit(30)
        .lean();

      const activeTab = "overview";
      res.render("admin/profiles/employerProfile", {
        user: req.session.user,

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
      const { id } = req.params;
      const unitTeam = await UnitTeam.findById(id).lean();

      const activities = await ActivityLog.find({ userID: id })
        .sort({ timestamp: -1 })
        .limit(30)
        .lean();

      const activeTab = "overview";
      res.render("admin/profiles/unitTeamProfile", {
        user: req.session.user,

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
      const { id } = req.params;
      const classification = await Classification.findById(id).lean();

      const activities = await ActivityLog.find({ userID: id })
        .sort({ timestamp: -1 })
        .limit(30)
        .lean();

      const activeTab = "overview";
      res.render("admin/profiles/classificationProfile", {
        user: req.session.user,

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
      const { id } = req.params;
      const facility_management = await Facility_Management.findById(id).lean();

      const activities = await ActivityLog.find({ userID: id })
        .sort({ timestamp: -1 })
        .limit(30)
        .lean();

      const activeTab = "overview";
      res.render("admin/profiles/facility_managementProfile", {
        user: req.session.user,

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
      const { id } = req.params;

      const admin = await Admin.findOne({ _id: id }).lean();

      const activities = await ActivityLog.find({ userID: id })
        .sort({ timestamp: -1 })
        .limit(30)
        .lean();

      const activeTab = "overview";
      res.render("admin/profiles/adminProfile", {
        user: req.session.user,

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
    const { companyID } = req.params;
    let { activeTab } = req.query;
    try {
      const company = await Company.findById(companyID).lean();
      const companyName = company.companyName;
      const positions = await Jobs.find({ companyName })
        .sort({ lastName: 1 })
        .lean();

      const employees = await Resident.find({
        companyName: companyName,
        isHired: true,
        isActive: true,
      })
        .sort({ lastName: 1 })
        .lean();

      if (!activeTab) activeTab = "overview";
      res.render("admin/profiles/companyProfile", {
        user: req.session.user,

        company,
        activeTab,
        positions,
        employees,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async addNewPosition(req, res) {
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
    try {
      await Jobs.create({
        companyID,
        companyName,
        position,
        description,
        skillSet: skillSet.trim() === "" ? "None" : skillSet, // Convert empty string to "None",
        pay,
        availablePositions: Number(availablePositions), // Ensure this is a number
        jobPool,
        facility,
      });

      const employerEmails = await getEmployeeEmails(companyName);

      //check if PI Contacts exist in this company
      if (employerEmails) {
        await sendNotificationsToEmployers(
          employerEmails,
          "position_created",
          `New job position created by admin.`,
          `/employer/managePositions`
        );
      }

      await createActivityLog(
        req.session.user._id.toString(),
        "added_user",
        `Added new job position for ${companyName}.`
      );

      res.redirect(`/admin/companyProfile/${companyID}?activeTab=positions`);
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
    let { activeTab, addMsg, saveMsg, errMsg, addErr, deleteMsg } = req.query;
    try {
      const companies = await Company.find().sort({ companyName: 1 }).lean();

      if (!activeTab) activeTab = "add";

      res.render("admin/db/companyDB", {
        user: req.session.user,

        companies,
        activeTab,
        addMsg,
        saveMsg,
        errMsg,
        addErr,
        deleteMsg,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async addCompany(req, res) {
    const newCompany = req.body;
    try {
      const company = new Company(newCompany);
      await company.save();

      await createActivityLog(
        req.session.user._id.toString(),
        "added_user",
        `Added new company: ${newCompany.companyName} to database.`
      );

      res.redirect(`/admin/companyDB?activeTab=add&addMsg=true`);
    } catch (err) {
      //check if company name already exists - companyName must be unique value
      if (err.code === 11000) {
        return res.redirect(`/admin/companyDB?activeTab=add&addErr=true`);
      } else {
        console.log("Error in creating company: ", err);
        res.render("error/500");
      }
    }
  },
  async searchCompanyName(req, res) {
    try {
      const { companyID } = req.body;
      const companyFound = await Company.findById({ _id: companyID }).lean();
      const companies = await Company.find().sort({ companyName: 1 }).lean();
      const activeTab = "edit";

      res.render("admin/db/companyDB", {
        user: req.session.user,

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
    const { companyName, facility, id } = req.body;
    try {
      await Company.updateOne(
        { _id: id },
        {
          $set: {
            companyName: companyName,
            facility: facility,
          },
        }
      );
      await createActivityLog(
        req.session.user._id.toString(),
        "edited_user",
        `Edited existing company: ${companyName} in database.`
      );

      res.redirect(`/admin/companyDB?activeTab=edit&saveMsg=true`);
    } catch (err) {
      console.log("Error in saving company edit: ", err);
      res.render("error/500");
    }
  },
  async deleteCompany(req, res) {
    const { companyID } = req.params;
    try {
      const company = await Company.findOne({ _id: companyID }).lean();
      const companyName = company.companyName;
      const employees = await Resident.find({ companyName });

      console.log(employees);
      //check if company has current resident employees
      if (employees.length == 0) {
        await createActivityLog(
          req.session.user._id.toString(),
          "deleted_user",
          `Deleted company: ${companyName} in database.`
        );
        //delete all employers attached to this company
        await Employer.deleteMany({ companyName: companyName });
        //delete company
        await Company.deleteOne({ _id: companyID });
        res.redirect(`/admin/companyDB?activeTab=edit&deleteMsg=true`);
      } else {
        res.redirect(`/admin/companyDB?activeTab=edit&errMsg=true`);
      }
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //==========================
  //   Employer DB
  //==========================
  async employerDB(req, res) {
    let { activeTab, addMsg, addErr, saveMsg, deleteMsg, saved, savingError } =
      req.query;
    try {
      const companies = await Company.find().sort({ companyName: 1 }).lean();
      const employers = await Employer.find().sort({ lastName: 1 }).lean();

      if (!activeTab) activeTab = "add";
      res.render("admin/db/employerDB", {
        user: req.session.user,

        companies,
        employers,
        activeTab,
        addMsg,
        addErr,
        saveMsg,
        deleteMsg,
        saved,
        savingError,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async addEmployer(req, res) {
    const newEmployer = req.body;
    try {
      const employer = new Employer(newEmployer);
      await employer.save();

      await createActivityLog(
        req.session.user._id.toString(),
        "added_user",
        `Added new employer: ${req.body.firstName} ${req.body.lastName} to database.`
      );

      res.redirect("/admin/employerDB?activeTab=add&addMsg=true");
    } catch (err) {
      //check if employer already exists to prevent duplicate accounts
      if (err.code === 11000) {
        return res.redirect(`/admin/employerDB?activeTab=add&addErr=true`);
      } else {
        console.log(err);
        res.render("error/500");
      }
    }
  },
  async searchEmployerName(req, res) {
    try {
      const { employerID } = req.body;
      const employerFound = await Employer.findById({
        _id: employerID,
      }).lean();
      const companies = await Company.find().sort({ companyName: 1 }).lean();
      const employers = await Employer.find().sort({ lastName: 1 }).lean();
      const activeTab = "edit";
      res.render("admin/db/employerDB", {
        user: req.session.user,

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
    const { id, companyName, firstName, lastName, email, facility } = req.body;
    try {
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

      await createActivityLog(
        req.session.user._id.toString(),
        "edited_user",
        `Edited PI Employer: ${firstName} ${lastName} in database.`
      );

      res.redirect("/admin/employerDB?activeTab=edit&saveMsg=true");
    } catch (err) {
      console.log("Error in saving company edit: ", err);
      res.render("error/500");
    }
  },
  async deleteEmployer(req, res) {
    const { employerID } = req.params;
    try {
      const employer = await Employer.findById(employerID).lean();

      await Employer.deleteOne({ _id: employerID });

      await createActivityLog(
        req.session.user._id.toString(),
        "deleted_user",
        `Deleted PI Contact ${employer.email} in database.`
      );

      res.redirect("/admin/employerDB?activeTab=edit&deleteMsg=true");
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async resetEmployerPassword(req, res) {
    const { password, confirmPassword } = req.body;
    const { employerID } = req.params;
    try {
      //if passwords match
      if (password === confirmPassword) {
        await updateEmployerPasswordById(employerID, password);

        const employerFound = await Employer.findById({
          _id: employerID,
        }).lean();

        await createActivityLog(
          req.session.user._id.toString(),
          "changed_password",
          `Changed PI Employer password: ${employerFound.firstName} ${employerFound.lastName}.`
        );
        res.redirect("/admin/employerDB?activeTab=edit&saved=true");
      } else {
        res.redirect("/admin/employerDB?activeTab=edit&savingError=true");
      }
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //==========================
  //   Resident DB
  //==========================
  async residentDB(req, res) {
    let { activeTab, addMsg, addErr, saveMsg } = req.query;
    try {
      const residents = await Resident.find({ isActive: true })
        .sort({ lastName: 1 })
        .lean();
      if (!activeTab) activeTab = "add";
      res.render("admin/db/residentDB", {
        user: req.session.user,

        activeTab,
        residents,
        addMsg,
        addErr,
        saveMsg,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async addResident(req, res) {
    const newResidentData = req.body;
    try {
      const newResident = new Resident(newResidentData);
      await newResident.save();

      await createActivityLog(
        req.session.user._id.toString(),
        "added_user",
        `Added new resident #${req.body.residentID} to database.`
      );

      res.redirect("/admin/residentDB?activeTab=add&addMsg=true");
    } catch (err) {
      //check if resident already exists to prevent duplicate values
      if (err.code === 11000) {
        res.redirect("/admin/residentDB?activeTab=add&addErr=true");
      } else {
        console.log(err);
        res.render("error/500");
      }
    }
  },
  async searchResidentID(req, res) {
    try {
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
    const {
      residentID,
      firstName,
      lastName,
      facility,
      custodyLevel,
      unitTeam,
      isActive,
    } = req.body;
    try {
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
            isActive,
          },
        }
      );

      await createActivityLog(
        req.session.user._id.toString(),
        "edited_user",
        `Edited resident #${residentID}.`
      );

      res.redirect("/admin/residentDB?activeTab=edit&saveMsg=true");
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //==========================
  //   Unit Team DB
  //==========================
  async unitTeamDB(req, res) {
    let {
      activeTab,
      addMsg,
      addErr,
      errMsg,
      saveMsg,
      deleteMsg,
      saved,
      savingErr,
    } = req.query;
    try {
      const unitTeam = await UnitTeam.find().sort({ firstName: 1 }).lean();

      if (!activeTab) activeTab = "add";
      res.render("admin/db/unitTeamDB", {
        user: req.session.user,
        activeTab,
        unitTeam,
        addMsg,
        addErr,
        errMsg,
        saveMsg,
        deleteMsg,
        saved,
        savingErr,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async searchUnitTeamName(req, res) {
    try {
      const { unitTeamID } = req.body;
      const unitTeamFound = await UnitTeam.findById({
        _id: unitTeamID,
      }).lean();

      const unitTeam = await UnitTeam.find().sort({ firstName: 1 }).lean();

      const activeTab = "edit";
      res.render("admin/db/unitTeamDB", {
        user: req.session.user,

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
    const newUnitTeam = req.body;
    try {
      const newMember = new UnitTeam(newUnitTeam);
      await newMember.save();

      await createActivityLog(
        req.session.user._id.toString(),
        "added_user",
        `Added new Unit Team Member to database: ${req.body.email}.`
      );

      res.redirect("/admin/unitTeamDB?activeTab=add&addMsg=true");
    } catch (err) {
      //check if unit team already exists to prevent duplicate values
      if (err.code === 11000) {
        res.redirect("/admin/unitTeamDB?activeTab=add&addErr=true");
      } else {
        console.log("Error in creating unitTeam: ", err);
        res.render("error/500");
      }
    }
  },
  async saveUnitTeamEdit(req, res) {
    const { firstName, lastName, email, facility, id } = req.body;
    try {
      const unitTeam = await UnitTeam.findOne({ _id: id });

      //update residents with new utm values
      await Resident.updateMany(
        { "resume.unitTeam": unitTeam.email }, // Find residents with the old unitTeam value
        {
          $set: {
            "resume.unitTeam": email,
            unitTeam: `$${unitTeam.firstName} ${unitTeam.lastName}`,
          },
        }
      );

      //update notifications with new utm values
      await Notification.updateMany(
        { recipient: unitTeam.email },
        {
          $set: {
            recipient: email,
          },
        }
      );

      //update unit team member
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

      await createActivityLog(
        req.session.user._id.toString(),
        "edited_user",
        `Edited Unit Team Member in database: ${email}.`
      );

      res.redirect("/admin/unitTeamDB?activeTab=edit&saveMsg=true");
    } catch (err) {
      console.log("Error in saving unit team edit: ", err);
      res.redirect("/admin/unitTeamDB?activeTab=edit&errMsg=true");
    }
  },
  async deleteUnitTeam(req, res) {
    const { unitTeamID } = req.params;
    const { UTMReplacementID } = req.body;
    try {
      const unitTeam = await UnitTeam.findById(unitTeamID).lean();
      const email = unitTeam.email;

      const UTMReplacement = await UnitTeam.findById(UTMReplacementID).lean();
      const replacementEmail = UTMReplacement.email;
      const replacementName = `${UTMReplacement.firstName} ${UTMReplacement.lastName}`;

      if (UTMReplacement) {
        //change UTM caseload to different UTM
        await Resident.updateMany(
          { "resume.unitTeam": email }, // Find residents with the old unitTeam value
          {
            $set: {
              "resume.unitTeam": replacementEmail,
              unitTeam: replacementName,
            },
          }
        );

        await UnitTeam.deleteOne({ _id: unitTeamID });

        await createActivityLog(
          req.session.user._id.toString(),
          "deleted_user",
          `Deleted Unit Team Member in database: ${unitTeam.email}.`
        );

        return res.redirect("/admin/unitTeamDB?activeTab=edit&deleteMsg=true");
      } else {
        res.redirect("/admin/unitTeamDB?activeTab=edit&errMsg=true");
      }
    } catch (err) {
      console.log("Error in deleting Unit Team member: ", err);
      res.render("error/500");
    }
  },
  async resetUnitTeamPassword(req, res) {
    const { password, confirmPassword } = req.body;
    const { unitTeamID } = req.params;
    try {
      //if password matches
      if (password === confirmPassword) {
        const unitTeam = await updateUnitTeamPasswordById(unitTeamID, password);

        await createActivityLog(
          req.session.user._id.toString(),
          "changed_password",
          `Changed password for Unit Team Member: ${unitTeam.email}.`
        );

        res.redirect("/admin/unitTeamDB?activeTab=edit&saved=true");
      } else {
        res.redirect("/admin/unitTeamDB?activeTab=edit&savingErr=true");
      }
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //==========================
  //   Admin DB
  //==========================
  async adminDB(req, res) {
    let { activeTab, addMsg, addErr, saveMsg, deleteMsg, saved, savingError } =
      req.query;
    try {
      const admin = await Admin.find().sort({ lastName: 1 }).lean();

      if (!activeTab) activeTab = "add";
      res.render("admin/db/adminDB", {
        user: req.session.user,

        activeTab,
        admin,
        addMsg,
        addErr,
        saveMsg,
        deleteMsg,
        saved,
        savingError,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async searchAdminName(req, res) {
    try {
      const { adminID } = req.body;
      const adminFound = await Admin.findById({
        _id: adminID,
      }).lean();

      const admin = await Admin.find().sort({ lastName: 1 }).lean();
      const activeTab = "edit";
      res.render("admin/db/adminDB", {
        user: req.session.user,

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
    const newAdmin = req.body;
    try {
      const newMember = new Admin(newAdmin);
      await newMember.save();

      await createActivityLog(
        req.session.user._id.toString(),
        "added_user",
        `Added new admin: ${req.body.email} to database.`
      );

      res.redirect("/admin/adminDB?activeTab=add&addMsg=true");
    } catch (err) {
      //check if admin already exists to prevent duplicate values
      if (err.code === 11000) {
        res.redirect("/admin/adminDB?activeTab=add&addErr=true");
      } else {
        console.log("Error in creating admin: ", err);
        res.render("error/500");
      }
    }
  },
  async saveAdminEdit(req, res) {
    const { firstName, lastName, email, facility, id } = req.body;

    try {
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

      await createActivityLog(
        req.session.user._id.toString(),
        "edited_user",
        `Edited admin: ${email} in database.`
      );

      res.redirect("/admin/adminDB?activeTab=edit&saveMsg=true");
    } catch (err) {
      console.log("Error in saving unit team edit: ", err);
      res.render("error/500");
    }
  },
  async deleteAdmin(req, res) {
    const { adminID } = req.params;

    try {
      await Admin.deleteOne({ _id: adminID });

      await createActivityLog(
        req.session.user._id.toString(),
        "deleted_user",
        `Deleted admin: ${req.body.email} in database.`
      );

      res.redirect("/admin/adminDB?activeTab=edit&deleteMsg=true");
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async resetAdminPassword(req, res) {
    const { password, confirmPassword } = req.body;
    const { adminID } = req.params;
    try {
      if (password == confirmPassword) {
        await updateAdminPasswordById(adminID, password);

        await createActivityLog(
          req.session.user._id.toString(),
          "changed_password",
          `Changed password for admin: ${req.body.email}.`
        );

        res.redirect("/admin/adminDB?activeTab=edit&saved=true");
      } else {
        res.redirect("/admin/adminDB?activeTab=edit&savingError=true");
      }
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //==========================
  //  Classification DB
  //==========================
  async classificationDB(req, res) {
    let { activeTab, addMsg, addErr, saveMsg, deleteMsg, saved, savingError } =
      req.query;
    try {
      const classification = await Classification.find()
        .sort({ lastName: 1 })
        .lean();

      if (!activeTab) activeTab = "add";
      res.render("admin/db/classificationDB", {
        user: req.session.user,

        activeTab,
        classification,
        addMsg,
        addErr,
        saveMsg,
        deleteMsg,
        saved,
        savingError,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async searchClassificationName(req, res) {
    try {
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
    const classification = req.body;

    try {
      const newMember = new Classification(classification);
      await newMember.save();

      await createActivityLog(
        req.session.user._id.toString(),
        "added_user",
        `Added new classification member: ${req.body.email} to database.`
      );

      res.redirect("/admin/classificationDB?activeTab=add&addMsg=true");
    } catch (err) {
      //check if member exists to prevent duplicates
      if (err.code === 11000) {
        res.redirect("/admin/classificationDB?activeTab=add&addErr=true");
      } else {
        console.log("Error in creating classification: ", err);
        res.render("error/500");
      }
    }
  },
  async saveClassificationEdit(req, res) {
    const { firstName, lastName, email, facility, id } = req.body;

    try {
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

      await createActivityLog(
        req.session.user._id.toString(),
        "edited_user",
        `Edited classification member: ${email} in database.`
      );

      res.redirect("/admin/classificationDB?activeTab=edit&saveMsg=true");
    } catch (err) {
      console.log("Error in saving unit team edit: ", err);
      res.render("error/500");
    }
  },
  async deleteClassification(req, res) {
    const { classificationID } = req.params;

    try {
      const member = await Classification.findById(classificationID).lean();

      await Classification.deleteOne({ _id: classificationID });

      await createActivityLog(
        req.session.user._id.toString(),
        "deleted_user",
        `Deleted classification member: ${member.email} in database.`
      );

      res.redirect("/admin/classificationDB?activeTab=edit&deleteMsg=true");
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async resetClassificationPassword(req, res) {
    const { password, confirmPassword } = req.body;
    const { classificationID } = req.params;
    try {
      if (password == confirmPassword) {
        await updateClassificationPasswordById(classificationID, password);

        const classification = await Classification.findById(
          classificationID
        ).lean();

        await createActivityLog(
          req.session.user._id.toString(),
          "changed_password",
          `Changed password for classification member: ${classification.email}.`
        );

        res.redirect("/admin/classificationDB?activeTab=edit&saved=true");
      } else {
        res.redirect("/admin/classificationDB?activeTab=edit&savingError=true");
      }
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //==========================
  //  Facility_Management DB
  //==========================
  async facility_managementDB(req, res) {
    let { activeTab, addMsg, addErr, saveMsg, deleteMsg, saved, savingError } =
      req.query;
    try {
      const facility_management = await Facility_Management.find()
        .sort({ lastName: 1 })
        .lean();

      if (!activeTab) activeTab = "add";

      res.render("admin/db/facility_managementDB", {
        user: req.session.user,

        activeTab,
        facility_management,
        addMsg,
        addErr,
        saveMsg,
        deleteMsg,
        saved,
        savingError,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async searchFacility_ManagementName(req, res) {
    try {
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
    const facility_Management = req.body;

    try {
      const newMember = new Facility_Management(facility_Management);
      await newMember.save();

      await createActivityLog(
        req.session.user._id.toString(),
        "added_user",
        `Added new Facility Management member: ${req.body.email}.`
      );

      res.redirect("/admin/facility_managementDB?activeTab=add&addMsg=true");
    } catch (err) {
      //check if member exists to prevent duplicates
      if (err.code === 11000) {
        res.redirect("/admin/facility_managementDB?activeTab=add&addErr=true");
      } else {
        console.log("Error in creating facility_management: ", err);
        res.render("error/500");
      }
    }
  },
  async saveFacility_ManagementEdit(req, res) {
    const { firstName, lastName, email, facility, id } = req.body;

    try {
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

      await createActivityLog(
        req.session.user._id.toString(),
        "edited_user",
        `Edited Facility Management member: ${email} in database.`
      );

      res.redirect("/admin/facility_managementDB?activeTab=edit&saveMsg=true");
    } catch (err) {
      console.log("Error in saving unit team edit: ", err);
      res.render("error/500");
    }
  },
  async deleteFacility_Management(req, res) {
    const { facility_managementID } = req.params;

    try {
      const facility_management = await Facility_Management.findById(
        facility_managementID
      ).lean();

      await Facility_Management.deleteOne({ _id: facility_managementID });

      await createActivityLog(
        req.session.user._id.toString(),
        "deleted_user",
        `Deleted Facility Management member: ${facility_management.email} in database.`
      );
      res.redirect(
        "/admin/facility_managementDB?activeTab=edit&deleteMsg=true"
      );
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async resetFacility_ManagementPassword(req, res) {
    const { password, confirmPassword } = req.body;
    const { facility_managementID } = req.params;
    try {
      if (password == confirmPassword) {
        await updateFacility_ManagementPasswordById(
          facility_managementID,
          password
        );

        const member = await Facility_Management.findById({
          _id: facility_managementID,
        }).lean();

        await createActivityLog(
          req.session.user._id.toString(),
          "changed_password",
          `Changed password for Facility Management member: ${member.email}.`
        );

        res.redirect("/admin/facility_managementDB?activeTab=edit&saved=true");
      } else {
        res.redirect(
          "/admin/facility_managementDB?activeTab=edit&savingError=true"
        );
      }
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
    let { noData } = req.query;
    try {
      if (!noData) noData = false;
      if (!noData) noData = false;
      res.render("shared/reports", {
        user: req.session.user,
        noData,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async residentReport(req, res) {
    try {
      const selectedFields = Object.keys(req.body);

      if (selectedFields.length === 0) {
        return res.redirect("/admin/reports?noData=true");
      }

      // Fetch data from MongoDB with only selected fields
      const residents = await Resident.find(
        { isActive: true },
        selectedFields.join(" ")
      )
        .sort({ lastName: 1 })
        .lean();

      if (residents.length === 0) {
        return res.redirect("/admin/reports?noData=true");
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
      const selectedFields = Object.keys(req.body);

      if (selectedFields.length === 0) {
        return res.redirect("/admin/reports?noData=true");
      }

      // Fetch data from MongoDB with only selected fields
      const residents = await Resident.find(
        { isHired: true, isActive: true },
        selectedFields.join(" ")
      )
        .sort({ lastName: 1 })
        .lean();

      if (residents.length === 0) {
        return res.redirect("/admin/reports?noData=true");
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
      const selectedFields = Object.keys(req.body);

      if (selectedFields.length === 0) {
        return res.redirect("/admin/reports?noData=true");
      }

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
        return res.redirect("/admin/reports?noData=true");
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
