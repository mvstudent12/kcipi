const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const Company = require("../models/Company");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");

//csv file upload requirements
const path = require("path");
const csv = require("csv-parser");
const fs = require("fs");

module.exports = {
  //serves admin dashboard from admin portal
  async dashboard(req, res) {
    try {
      //finds residents who have not been reviewed for eligibility but have aproved resumes
      const residentsNeedReview = await Resident.find({
        isEligibleToWork: false,
        isRestrictedFromWork: false,
        resumeIsApproved: true,
      }).lean();

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
        { $group: { _id: null, allResidents: { $push: "$applicants" } } }, // Collect all resident IDs, including duplicates
      ]).then((result) => {
        if (result.length !== 0) {
          console.log(result);
          return (applicantIDs = result[0].allResidents);
        } else {
          return;
        }
      });

      const allJobApplicants = await Resident.find(
        { _id: { $in: applicantIDs } },
        "firstName lastName facility residentID custodyLevel"
      ).lean();

      res.render("admin/dashboard", {
        residentsNeedReview,
        resumeNeedReview,
        caseLoad,
        allJobApplicants,
        user: req.session.user,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async applicants(req, res) {
    try {
      const companyName = req.session.user.companyName;

      //create object with all applicants
      let applicantIDs = [];

      await Jobs.aggregate([
        { $unwind: "$applicants" }, // Flatten the applicants array
        { $group: { _id: null, allResidents: { $push: "$applicants" } } }, // Collect all resident IDs, including duplicates
      ]).then((result) => {
        if (result.length !== 0) {
          console.log(result);
          return (applicantIDs = result[0].allResidents);
        } else {
          return;
        }
      });

      const allJobApplicants = await Resident.find(
        { _id: { $in: applicantIDs } },
        "firstName lastName facility residentID custodyLevel"
      ).lean();

      // Query Resident model to find residents matching these IDs that applied to jobs
      const applicants = await Resident.find({
        _id: { $in: applicantIDs },
      }).lean();

      res.render("admin/applicants", { user: req.session.user, applicants });
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
      const activeTab = "overview";
      res.render("admin/profiles/companyProfile", {
        user: req.session.user,
        company,
        activeTab,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async addNewPosition(req, res) {
    try {
      const { id, position, description, pay, jobPool, availablePositions } =
        req.body;
      const newPosition = await Company.updateOne(
        { _id: id },
        {
          $push: {
            jobs: {
              position: position,
              description: description,
              pay: pay,
              jobPool: jobPool,
              availablePositions: availablePositions,
              isAvailable: true,
            },
          },
        }
      );
      const company = await Company.findById(id).lean();
      const activeTab = "positions";
      res.render("admin/profiles/companyProfile", {
        user: req.session.user,
        company,
        activeTab,
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
      const activeTab = "add";
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
    //BE CAREFUL - THIS IS OVERWRITE ALL RESIDENT DATA NEED TO ALTER SO IT ONLY UPDATES!!
    try {
      const filePath = path.join(__dirname, "../../uploads", req.file.filename);

      // Parse the CSV and populate the database
      const results = [];
      const requiredFields = [
        "firstName",
        "lastName",
        "residentID",
        "custodyLevel",
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
            });
            //checks for errors
            if (errors.length > 0) {
              console.log(errors);
              const dataMSG =
                "This csv file is not formatted correctly. Please verify that it has the correct fields.";
              res.render("admin/db/residentDB", {
                user: req.session.user,
                dataMSG,
              });
            } else {
              await Resident.collection.drop();
              console.log("Resident Collection dropped");
              // Insert parsed CSV data into MongoDB
              await Resident.insertMany(results);
              console.log("CSV data has been inserted into the database.");
              const dataMSG = "Resident Database successfully updated.";
              const residents = await Resident.find().lean();
              res.render("admin/db/residentDB", {
                user: req.session.user,
                dataMSG,
                residents,
              });
            }
          } catch (err) {
            console.log(err);
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
      if (residentFound) {
        const unitTeam = await UnitTeam.find({
          facility: residentFound.facility,
        })
          .sort({ firstName: 1 })
          .lean();
        if (!unitTeam) {
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
};
