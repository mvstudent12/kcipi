const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const Company = require("../models/Company");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");

const { Parser } = require("json2csv");

//csv file upload requirements
const fs = require("fs");
const path = require("path");
const moment = require("moment");
const csv = require("csv-parser");

async function getAllInterviews() {
  try {
    const jobs = await Jobs.find(
      {},
      { companyName: 1, interviews: 1, _id: 0 }
    ).lean();
    const interviews = jobs.flatMap((job) =>
      job.interviews.map((interview) => ({
        companyName: job.companyName, // Attach companyName to each interview
        ...interview, // Spread interview details
      }))
    ); // Flatten the array of arrays

    return interviews;
  } catch (error) {
    console.error("Error fetching interviews:", error);
  }
}
const findApplicantIDsAndCompanyName = async (IDs) => {
  try {
    let applicantIDs = [];

    // Aggregation pipeline to retrieve applicant IDs and associated companyName
    await Jobs.aggregate([
      { $unwind: "$applicants" }, // Flatten the applicants array
      { $match: { "applicants.resident_id": { $in: IDs } } }, // Filter applicants by residentID array
      {
        $project: {
          applicantID: "$applicants", // Rename applicants to applicantID for clarity
          companyName: 1, // Include the companyName field
          dateCreated: 1,
        },
      },
      {
        $group: {
          _id: null,
          allApplicants: {
            $push: {
              applicantID: "$applicantID",
              companyName: "$companyName",
              dateCreated: "$dateCreated",
            },
          },
        },
      }, // Group by null to get all applicants
    ]).then((result) => {
      if (result.length > 0) {
        applicantIDs = result[0].allApplicants;
      }
    });

    return applicantIDs;
  } catch (error) {
    console.error("Error fetching applicantIDs:", error);
    throw error; // Re-throw the error to handle it in the calling code
  }
};
const createApplicantsReport = async (applicantData, selectedFields) => {
  try {
    const applicantIDs = applicantData.map((item) => item.applicantID);

    // Always include _id for mapping, but remove it later if not requested
    const includeID = selectedFields.includes("_id");
    const fieldsToSelect = includeID
      ? selectedFields
      : [...selectedFields, "_id"];

    // Find residents with only the selected fields
    const residents = await Resident.find(
      { _id: { $in: applicantIDs } },
      fieldsToSelect.join(" ")
    ).lean();

    // Fetch dateApplied and companyName for each applicant
    const jobData = await Jobs.aggregate([
      { $unwind: "$applicants" }, // Flatten applicants array
      { $match: { "applicants.resident_id": { $in: applicantIDs } } }, // Match applicant resident_id
      {
        $project: {
          applicantID: "$applicants.resident_id",
          companyName: 1,
          dateApplied: "$applicants.dateApplied", // Extract dateApplied from the applicants array
        },
      },
    ]);

    // Map residents with companyName and dateApplied
    const residentsWithDetails = residents.map((resident) => {
      const matchingCompany = applicantData.find(
        (item) => item.applicantID.toString() === resident._id.toString()
      );

      const matchingJob = jobData.find(
        (job) => job.applicantID.toString() === resident._id.toString()
      );

      const residentWithDetails = {
        ...resident,
        companyName: matchingCompany ? matchingCompany.companyName : null,
        dateApplied: matchingJob ? matchingJob.dateApplied : null, // Attach dateApplied
      };

      // Remove _id if it wasn't in the original selected fields
      if (!includeID) {
        delete residentWithDetails._id;
      }

      return residentWithDetails;
    });

    console.log(residentsWithDetails);
    return residentsWithDetails;
  } catch (error) {
    console.error("Error fetching residents with details:", error);
    throw error;
  }
};
module.exports = {
  //serves admin dashboard from admin portal
  async dashboard(req, res) {
    try {
      //finds residents who need resumes approved
      const resumeNeedReview = await Resident.find({
        resumeIsComplete: true,
        resumeIsApproved: false,
      }).lean();
      //find all residents in KDOC
      const caseLoad = await Resident.find().lean();

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
        { _id: { $in: applicantIDs } },
        "firstName lastName facility residentID custodyLevel"
      ).lean();

      res.render("admin/dashboard", {
        resumeNeedReview,
        caseLoad,
        allJobApplicants,
        user: req.session.user,
      });
    } catch (err) {
      console.log(err);
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
        { _id: { $in: applicantIDs } },
        "firstName lastName facility residentID custodyLevel outDate"
      ).lean();

      let interviews = await getAllInterviews();
      console.log(interviews);

      const employees = await Resident.find({ isHired: true }).lean();

      res.render("admin/manageWorkForce", {
        user: req.session.user,
        applicants,
        interviews,
        employees,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async manageClearance(req, res) {
    try {
      //find caseload specific to UTM
      const caseLoad = await Resident.find({}).lean();
      res.render("admin/manageClearance", {
        user: req.session.user,
        caseLoad,
      });
    } catch (err) {
      console.log(err);
    }
  },

  //serves help page from admin dashboard
  async helpDesk(req, res) {
    try {
      res.render("admin/helpDesk", { user: req.session.user });
    } catch (err) {
      console.log(err);
    }
  },

  //serves contact page from admin dashboard
  async contact(req, res) {
    try {
      res.render("admin/contact", { user: req.session.user });
    } catch (err) {
      console.log(err);
    }
  },
  //=============================
  //   Logging
  //=============================
  // Serves logs from the admin dashboard
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
      console.log(err);
    }
  },
  //=============================
  //   PI Roster Tables
  //=============================
  //serves residentTables page from admin dashboard
  async residentTables(req, res) {
    try {
      const residents = await Resident.find().lean();
      res.render("admin/tables/residentTables", {
        user: req.session.user,
        residents,
      });
    } catch (err) {
      console.log(err);
    }
  },
  //serves hiredResidents page from admin dashboard
  async employedResidents(req, res) {
    try {
      const residents = await Resident.find({ isHired: true }).lean();
      console.log(residents);
      res.render("admin/tables/hiredResidents", {
        user: req.session.user,
        residents,
      });
    } catch (err) {
      console.log(err);
    }
  },

  //serves unitTeamTables page from admin dashboard
  async unitTeamTables(req, res) {
    try {
      const unitTeam = await UnitTeam.find().lean();
      res.render("admin/tables/unitTeamTables", {
        user: req.session.user,
        unitTeam,
      });
    } catch (err) {
      console.log(err);
    }
  },

  //serves employerTables page from admin dashboard
  async employerTables(req, res) {
    try {
      const employers = await Employer.find().sort({ firstName: 1 }).lean();
      res.render("admin/tables/employerTables", {
        user: req.session.user,
        employers,
      });
    } catch (err) {
      console.log(err);
    }
  },

  //serves companyTables page from admin dashboard
  async companyTables(req, res) {
    try {
      const companies = await Company.find().sort({ firstName: 1 }).lean();
      res.render("admin/tables/companyTables", {
        user: req.session.user,
        companies,
      });
    } catch (err) {
      console.log(err);
    }
  },
  //=============================
  //   Profile Routes
  //=============================
  async employerProfile(req, res) {
    try {
      const id = req.params.id;
      const employer = await Employer.findById(id).lean();
      const activeTab = "overview";
      res.render("admin/profiles/employerProfile", {
        user: req.session.user,
        employer,
        activeTab,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async unitTeamProfile(req, res) {
    try {
      const id = req.params.id;
      const unitTeam = await UnitTeam.findById(id).lean();
      const activeTab = "overview";
      res.render("admin/profiles/unitTeamProfile", {
        user: req.session.user,
        unitTeam,
        activeTab,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async companyProfile(req, res) {
    try {
      const id = req.params.id;
      const company = await Company.findById(id).lean();
      const companyName = company.companyName;
      const positions = await Jobs.find({ companyName }).lean();
      const activeTab = "overview";
      res.render("admin/profiles/companyProfile", {
        user: req.session.user,
        company,
        activeTab,
        positions,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async addNewPosition(req, res) {
    try {
      const {
        companyID,
        companyName,
        position,
        description,
        pay,
        jobPool,
        availablePositions,
        facility,
      } = req.body;

      const newJob = await Jobs.create({
        companyID,
        companyName,
        position,
        description,
        pay,
        availablePositions: Number(availablePositions), // Ensure this is a number
        jobPool,
        facility,
      });

      const company = await Company.findOne({
        companyName: companyName,
      }).lean();
      const positions = await Jobs.find({ companyID }).lean();

      const activeTab = "positions";
      res.render("admin/profiles/companyProfile", {
        user: req.session.user,
        company,
        activeTab,
        positions,
      });
    } catch (err) {
      console.log(err);
    }
  },

  //==========================
  //   DB Routes
  //==========================

  // Company DB ==================

  //serves companyDB page from admin dashboard
  async companyDB(req, res) {
    try {
      const companies = await Company.find().sort({ companyName: 1 }).lean();
      activeTab = "add";
      res.render("admin/db/companyDB", {
        user: req.session.user,
        companies,
        activeTab,
      });
    } catch (err) {
      console.log(err);
    }
  },
  //adds new company to Company DB
  async addCompany(req, res) {
    try {
      const newCompany = req.body;
      const company = new Company(newCompany);
      const savedCompany = await company.save();

      const companies = await Company.find().sort({ companyName: 1 }).lean();

      const activeTab = "add";
      const addMsg = true;
      res.render("admin/db/companyDB", {
        user: req.session.user,
        companies,
        activeTab,
        addMsg,
      });
    } catch (err) {
      console.log("Error in creating company: ", err);
    }
  },
  //searches for company by name
  async searchCompanyName(req, res) {
    try {
      const { companyID } = req.body;
      const companyFound = await Company.findById({ _id: companyID }).lean();
      const companies = await Company.find().sort({ companyName: 1 }).lean();
      activeTab = "edit";

      res.render("admin/db/companyDB", {
        user: req.session.user,
        companies,
        companyFound,
        activeTab,
      });
    } catch (err) {
      console.log(err);
    }
  },
  //save edits made to company
  async saveCompanyEdit(req, res) {
    try {
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
      const saveMsg = true;
      activeTab = "edit";
      res.render("admin/db/companyDB", {
        user: req.session.user,
        companies,
        saveMsg,
        activeTab,
      });
    } catch (err) {
      console.log("Error in saving company edit: ", err);
    }
  },
  //==========================
  //   Employer DB
  //==========================
  //serves employerDB page from admin dashboard
  async employerDB(req, res) {
    try {
      const companies = await Company.find().sort({ companyName: 1 }).lean();
      const employers = await Employer.find().sort({ firstName: 1 }).lean();
      const activeTab = "add";
      res.render("admin/db/employerDB", {
        user: req.session.user,
        companies,
        employers,
        activeTab,
      });
    } catch (err) {
      console.log(err);
    }
  },
  //adds new employer to db
  async addEmployer(req, res) {
    try {
      const newEmployer = req.body;
      const employer = new Employer(newEmployer);
      await employer.save();
      const companies = await Company.find().sort({ companyName: 1 }).lean();
      const employers = await Employer.find().sort({ firstName: 1 }).lean();
      const activeTab = "add";
      const addMsg = true;
      res.render("admin/db/employerDB", {
        user: req.session.user,
        companies,
        employers,
        activeTab,
        addMsg,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async searchEmployerName(req, res) {
    try {
      const { employerID } = req.body;
      const employerFound = await Employer.findById({
        _id: employerID,
      }).lean();
      const companies = await Company.find().sort({ companyName: 1 }).lean();
      const employers = await Employer.find().sort({ firstName: 1 }).lean();
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
    }
  },

  //save edits made to employer
  async saveEmployerEdit(req, res) {
    try {
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
      const saveMsg = true;
      activeTab = "edit";
      res.render("admin/db/employerDB", {
        user: req.session.user,
        companies,
        saveMsg,
        activeTab,
      });
    } catch (err) {
      console.log("Error in saving company edit: ", err);
    }
  },
  //==========================
  //   Resident DB
  //==========================
  //serves residentDB page from admin dashboard
  async residentDB(req, res) {
    try {
      const residents = await Resident.find().lean();
      const activeTab = "update";
      res.render("admin/db/residentDB", {
        user: req.session.user,
        activeTab,
        residents,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async updateAllResidentsDB(req, res) {
    try {
      const activeTab = "update";
      const filePath = path.join(__dirname, "../../uploads", req.file.filename);

      // Parse the CSV and populate the database
      const results = [];
      const requiredFields = [
        "firstName",
        "lastName",
        "residentID",
        "custodyLevel",
        "outDate",
        "facility",
      ];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", async () => {
          try {
            const errors = [];
            //validate csv file fields
            results.forEach((row, index) => {
              requiredFields.forEach((field) => {
                if (!row[field]) {
                  errors.push(
                    `Row ${index + 1}: Missing required field '${field}'`
                  );
                }
              });
              // Validate residentID format (assuming it's a 7-digit number)
              if (row.residentID && !/^\d{7}$/.test(row.residentID)) {
                errors.push(`Row ${index + 1}: Invalid residentID format.`);
              }
            });
            //checks for errors
            if (errors.length > 0) {
              console.log(errors);
              const dataMSG =
                "This csv file is not formatted correctly. Please verify that it has the correct fields.";
              res.render("admin/db/residentDB", {
                user: req.session.user,
                dataMSG,
                activeTab,
              });
            } else {
              // Update or insert residents based on residentID
              for (const residentData of results) {
                await Resident.findOneAndUpdate(
                  { residentID: residentData.residentID }, // Find resident by residentID
                  residentData, // Update with new data
                  { upsert: true } // Create a new document if it doesn't exist
                );
              }
              console.log(
                "Resident data has been updated or inserted into the database."
              );
              // Update 'isActive' status for residents not in the CSV
              const residentIDs = results.map((r) => r.residentID);
              await Resident.updateMany(
                { residentID: { $nin: residentIDs } }, // Residents not in the CSV
                { $set: { isActive: false } } // Set 'isActive' to false
              );

              const dataMSG = "Residents successfully updated.";
              const residents = await Resident.find().lean();

              res.render("admin/db/residentDB", {
                user: req.session.user,
                dataMSG,
                residents,
                activeTab,
              });
            }
          } catch (err) {
            console.error("Error processing CSV:", err);
            const dataMSG = "An error occurred while processing the CSV file.";
            return res.render("admin/db/residentDB", {
              user: req.session.user,
              dataMSG,
              activeTab,
            });
          } finally {
            // Clean up the uploaded file
            fs.unlinkSync(filePath);
          }
        });
    } catch (err) {
      console.error(err);
    }
  },

  //adds new employer to db
  async addResident(req, res) {
    try {
      const newResidentData = req.body;
      const newResident = new Resident(newResidentData);
      await newResident.save();
      const activeTab = "add";
      const addMsg = true;
      const residents = await Resident.find().lean();
      res.render("admin/db/residentDB", {
        user: req.session.user,
        activeTab,
        addMsg,
        residents,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async searchResidentID(req, res) {
    const { residentID } = req.body;

    try {
      const residentFound = await Resident.findOne({ residentID }).lean();
      console.log(residentFound);
      if (residentFound) {
        const unitTeam = await UnitTeam.find({
          facility: residentFound.facility,
        })
          .sort({ firstName: 1 })
          .lean();
        if (unitTeam.length === 0) {
          unitTeam = null;
        }
        const activeTab = "edit";
        const residents = await Resident.find().lean();

        res.render("admin/db/residentDB", {
          user: req.session.user,
          residentFound,
          unitTeam,
          activeTab,
          residents,
        });
      } else {
        const activeTab = "edit";
        const failedSearch = true;
        const residents = await Resident.find().lean();
        res.render("admin/db/residentDB", {
          user: req.session.user,
          failedSearch,
          activeTab,
          residents,
        });
      }
    } catch (err) {
      console.log(err);
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
          },
        }
      );
      const resident = await Resident.findOne({ residentID }).lean();

      const activeTab = "edit";
      const saveMsg = true;
      const residents = await Resident.find().lean();
      res.render("admin/db/residentDB", {
        user: req.session.user,
        resident,
        saveMsg,
        activeTab,
        residents,
      });
    } catch (err) {
      console.log(err);
    }
  },
  //==========================
  //   Unit Team DB
  //==========================
  //serves unitTeamDB page from admin dashboard
  async unitTeamDB(req, res) {
    try {
      const unitTeam = await UnitTeam.find().sort({ firstName: 1 }).lean();
      const activeTab = "add";
      res.render("admin/db/unitTeamDB", {
        user: req.session.user,
        activeTab,
        unitTeam,
      });
    } catch (err) {
      console.log(err);
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
    }
  },
  //adds new member to unit team DB
  async addUnitTeam(req, res) {
    try {
      const newUnitTeam = req.body;
      const newMember = new UnitTeam(newUnitTeam);
      const savedUnitTeam = await newMember.save();

      const unitTeam = await UnitTeam.find().sort({ unitTeamName: 1 }).lean();

      const activeTab = "add";
      const addMsg = true;
      res.render("admin/db/unitTeamDB", {
        user: req.session.user,
        unitTeam,
        activeTab,
        addMsg,
      });
    } catch (err) {
      console.log("Error in creating unitTeam: ", err);
    }
  },
  //save edits made to unitTeam
  async saveUnitTeamEdit(req, res) {
    try {
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

      const unitTeam = await UnitTeam.find().sort({ firstName: 1 }).lean();
      const saveMsg = true;
      activeTab = "edit";
      res.render("admin/db/unitTeamDB", {
        user: req.session.user,
        unitTeam,
        saveMsg,
        activeTab,
      });
    } catch (err) {
      console.log("Error in saving unit team edit: ", err);
    }
  },
  //==========================
  //   Reports
  //==========================
  //serves reports page from admin dashboard
  async reports(req, res) {
    try {
      res.render("admin/reports", { user: req.session.user });
    } catch (err) {
      console.log(err);
    }
  },
  async residentReport(req, res) {
    try {
      const selectedFields = Object.keys(req.body);

      if (selectedFields.length === 0) {
        const noData = true;
        return res.render("admin/reports", {
          user: req.session.user,
          noData,
        });
      }

      // Fetch data from MongoDB with only selected fields
      const residents = await Resident.find(
        {},
        selectedFields.join(" ")
      ).lean();

      if (residents.length === 0) {
        const noData = true;
        return res.render("admin/reports", {
          user: req.session.user,
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
      res.status(500).send("Error generating report.");
    }
  },
  async employedResidentsReport(req, res) {
    try {
      const selectedFields = Object.keys(req.body);

      if (selectedFields.length === 0) {
        const noData = true;
        return res.render("admin/reports", {
          user: req.session.user,
          noData,
        });
      }

      // Fetch data from MongoDB with only selected fields
      const residents = await Resident.find(
        { isHired: true },
        selectedFields.join(" ")
      ).lean();

      if (residents.length === 0) {
        const noData = true;
        return res.render("admin/reports", {
          user: req.session.user,
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
      res.status(500).send("Error generating report.");
    }
  },

  //Applicants Report
  async applicantsReport(req, res) {
    try {
      const selectedFields = Object.keys(req.body);

      if (selectedFields.length === 0) {
        const noData = true;
        return res.render("admin/reports", {
          user: req.session.user,
          noData,
        });
      }

      const email = req.session.user.email;

      //find caseload specific to UTM
      const caseLoad = await Resident.find({}).lean();

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
      res.status(500).send("Error generating report.");
    }
  },
};
