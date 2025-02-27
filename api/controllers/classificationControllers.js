const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");

const { Parser } = require("json2csv");

const logger = require("../utils/logger");

const { getUserNotifications } = require("../utils/notificationUtils");

const {
  findInterviews,
  findApplicantIDsAndCompanyName,
  findResidentsWithCompany,
  createApplicantsReport,
} = require("../utils/classificationUtils");

const { getTotalAvailablePositions } = require("../utils/employerUtils");

module.exports = {
  async dashboard(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const facility = req.session.user.facility;

      //find caseload specific to UTM
      const caseLoad = await Resident.find({
        facility: facility,
        isActive: true,
      })
        .sort({ lastName: 1 })
        .lean();

      //make array of resident _id in caseload
      const IDs = caseLoad.flatMap((resident) => resident._id);

      //make array of resident _id in caseload
      const residentIDs = caseLoad.flatMap((resident) => resident.residentID);

      let applicantIDs = await findApplicantIDsAndCompanyName(IDs);

      //find all residents with applications in
      const applicants = await findResidentsWithCompany(applicantIDs);

      //find all residents who are actively hired
      const employees = await Resident.find({
        facility: facility,
        isHired: true,
        isActive: true,
      }).lean();

      //find all active interviews
      const interviews = await findInterviews(residentIDs);

      //count pending resumes
      const pendingResumes = await Resident.countDocuments({
        "resume.status": "pending",
        facility,
      });

      res.render("classification/dashboard", {
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
  async helpDesk(req, res) {
    const { sentMsg } = req.query;
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      res.render("classification/helpDesk", {
        user: req.session.user,
        notifications,
        sentMsg,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async contact(req, res) {
    const { sentMsg } = req.query;
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      res.render("classification/contact", {
        user: req.session.user,
        notifications,
        sentMsg,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async manageWorkForce(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const facility = req.session.user.facility;

      const caseLoad = await Resident.find({
        facility: facility,
        isActive: true,
      })
        .sort({ lastName: 1 })
        .lean();

      //make array of resident _id in caseload
      const IDs = caseLoad.flatMap((resident) => resident._id);

      //make array of residentID in caseload
      const residentIDs = caseLoad.flatMap((resident) => resident.residentID);

      let applicantIDs = await findApplicantIDsAndCompanyName(IDs);

      const applicants = await findResidentsWithCompany(applicantIDs);

      const interviews = await findInterviews(residentIDs);

      //find all residents who are actively hired
      const employees = await Resident.find({
        facility: facility,
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

      res.render("classification/manageWorkForce", {
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
  async manageClearance(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const facility = req.session.user.facility;
      //find caseload specific to UTM
      const caseLoad = await Resident.find({
        facility: facility,
        isActive: true,
      })
        .sort({ lastName: 1 })
        .lean();

      res.render("classification/manageClearance", {
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
      const caseLoad = await Resident.find({ facility, isActive: true })
        .sort({ lastName: 1 })
        .lean();
      res.render("classification/tables/residents", {
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
      res.render("classification/tables/resumes", {
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
      res.render("classification/tables/clearance", {
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

      res.render("classification/tables/applicants", {
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

      res.render("classification/tables/employees", {
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
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      res.render("classification/reports", {
        user: req.session.user,
        notifications,
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
        const noData = true;
        return res.render("classification/reports", {
          user: req.session.user,
          notifications,
          noData,
        });
      }

      // Fetch data from MongoDB with only selected fields
      const residents = await Resident.find(
        { facility: facility, isActive: true },
        selectedFields.join(" ")
      ).lean();

      if (residents.length === 0) {
        const noData = true;
        return res.render("classification/reports", {
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
        const noData = true;
        return res.render("classification/reports", {
          user: req.session.user,
          notifications,
          noData,
        });
      }

      // Fetch data from MongoDB with only selected fields
      const residents = await Resident.find(
        { facility: facility, isHired: true, isActive: true },
        selectedFields.join(" ")
      ).lean();

      if (residents.length === 0) {
        const noData = true;
        return res.render("classification/reports", {
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
  async applicantsReport(req, res) {
    try {
      const selectedFields = Object.keys(req.body);

      if (selectedFields.length === 0) {
        const noData = true;
        return res.render("classification/reports", {
          user: req.session.user,
          notifications,
          noData,
        });
      }

      const facility = req.session.user.facility;

      //find caseload specific to UTM
      const caseLoad = await Resident.find({
        facility: facility,
        isActive: true,
      })
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
        return res.render("classification/reports", {
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
      logger.warn("Error generating report: " + err);
      res.render("error/500");
    }
  },
};
