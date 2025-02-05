const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");

const { Parser } = require("json2csv");

const findInterviews = async (residentIDs) => {
  try {
    const interviews = await Jobs.aggregate([
      // Unwind the interviews array to separate each interview
      { $unwind: "$interviews" },

      // Match interviews where residentID is in the applicantIDs array
      {
        $match: {
          "interviews.residentID": { $in: residentIDs },
        },
      },

      // Optionally, project to return only the interview details
      {
        $project: {
          _id: 0, // Exclude the job _id
          interview: "$interviews", // Include the interview details
          jobId: "$_id", // Include the job _id for context
          companyName: "$companyName",
        },
      },
    ]);
    return interviews;
  } catch (error) {
    console.error("Error fetching interviews:", error);
    throw error; // Re-throw the error to handle it in the calling code
  }
};

const findApplicantIDs = async (IDs) => {
  try {
    let applicantIDs = [];
    //make array of applicant ids
    await Jobs.aggregate([
      { $unwind: "$applicants" }, // Flatten the applicants array
      { $match: { "applicants.resident_id": { $in: IDs } } }, // Filter applicants by residentID array
      { $group: { _id: null, allResidents: { $push: "$applicants" } } }, // Collect matching resident IDs
    ]).then((result) => {
      if (result.length > 0) {
        applicantIDs = result[0].allResidents;
      }
    });
    return applicantIDs;
  } catch (error) {
    console.error("Error fetching applicantIDs:", error);
    throw error; // Re-throw the error to handle it in the calling code
  }
};

const findApplicantIDsAndCompanyName = async (IDs) => {
  try {
    let applicantIDs = [];

    // Aggregation pipeline to retrieve applicant IDs and associated companyName
    const result = await Jobs.aggregate([
      { $unwind: "$applicants" }, // Flatten the applicants array
      { $match: { "applicants.resident_id": { $in: IDs } } }, // Filter applicants by residentID array
      {
        $project: {
          applicantID: "$applicants.resident_id", // Renamed applicants to applicantID for clarity
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
    ]);

    if (result.length > 0) {
      applicantIDs = result[0].allApplicants;
    }

    return applicantIDs;
  } catch (error) {
    console.error("Error fetching applicantIDs:", error);
    throw error; // Re-throw the error to handle it in the calling code
  }
};

const findResidentsWithCompany = async (applicantData) => {
  try {
    // Extract all applicant IDs from the provided array
    const applicantIDs = applicantData.map((item) => item.applicantID);

    // Find all residents with matching applicant IDs
    const residents = await Resident.find({
      _id: { $in: applicantIDs },
    }).lean();

    // Add companyName to each resident object
    const residentsWithCompany = residents.map((resident) => {
      // Find the corresponding companyName for each resident
      const matchingCompany = applicantData.find(
        (item) => item.applicantID.toString() === resident._id.toString()
      );
      return {
        ...resident,
        companyName: matchingCompany ? matchingCompany.companyName : null,
      };
    });

    return residentsWithCompany;
  } catch (error) {
    console.error("Error fetching residents with company:", error);
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
  async dashboard(req, res) {
    try {
      const email = req.session.user.email;

      //find caseload specific to UTM
      const caseLoad = await Resident.find({
        "resume.unitTeam": email,
      }).lean();

      //make array of resident _id in caseload
      const IDs = caseLoad.flatMap((resident) => resident._id);
      console.log(IDs);

      //make array of resident _id in caseload
      const residentIDs = caseLoad.flatMap((resident) => resident.residentID);

      let applicantIDs = await findApplicantIDsAndCompanyName(IDs);

      //find all residents with applications in
      const applicants = await findResidentsWithCompany(applicantIDs);

      //find all residents who are actively hired
      const employees = await Resident.find({
        "resume.unitTeam": email,
        isHired: true,
      }).lean();

      //find all active interviews
      const interviews = await findInterviews(residentIDs);
      console.log(applicants);
      res.render("unitTeam/dashboard", {
        user: req.session.user,
        caseLoad,
        applicants,
        interviews,
        employees,
      });
    } catch (err) {
      console.log(err);
    }
  },

  async helpDesk(req, res) {
    try {
      res.render("unitTeam/helpDesk", { user: req.session.user });
    } catch (err) {
      console.log(err);
    }
  },

  async contact(req, res) {
    try {
      res.render("unitTeam/contact", { user: req.session.user });
    } catch (err) {
      console.log(err);
    }
  },
  async manageWorkForce(req, res) {
    try {
      const email = req.session.user.email;
      const caseLoad = await Resident.find({
        "resume.unitTeam": email,
      }).lean();

      //make array of resident _id in caseload
      const IDs = caseLoad.flatMap((resident) => resident._id);

      //make array of residentID in caseload
      const residentIDs = caseLoad.flatMap((resident) => resident.residentID);

      let applicantIDs = await findApplicantIDsAndCompanyName(IDs);

      const applicants = await findResidentsWithCompany(applicantIDs);

      const interviews = await findInterviews(residentIDs);

      //find all residents who are actively hired
      const employees = await Resident.find({
        "resume.unitTeam": email,
        isHired: true,
      }).lean();

      res.render("unitTeam/manageWorkForce", {
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
      const email = req.session.user.email;

      //find caseload specific to UTM
      const caseLoad = await Resident.find({
        "resume.unitTeam": email,
      }).lean();

      res.render("unitTeam/manageClearance", {
        user: req.session.user,
        caseLoad,
      });
    } catch (err) {
      console.log(err);
    }
  },
  //===============================
  //        ROSTERS
  //===============================
  async residents(req, res) {
    try {
      const facility = req.session.user.facility;
      const caseLoad = await Resident.find({ facility }).lean();
      res.render("unitTeam/tables/residents", {
        user: req.session.user,
        caseLoad,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async resumes(req, res) {
    try {
      const facility = req.session.user.facility;
      const caseLoad = await Resident.find({ facility }).lean();
      res.render("unitTeam/tables/resumes", {
        user: req.session.user,
        caseLoad,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async clearance(req, res) {
    try {
      const facility = req.session.user.facility;
      const caseLoad = await Resident.find({ facility }).lean();
      res.render("unitTeam/tables/clearance", {
        user: req.session.user,
        caseLoad,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async applicants(req, res) {
    try {
      const facility = req.session.user.facility;

      const caseLoad = await Resident.find({ facility }).lean();

      //make array of resident _id in caseload
      const IDs = caseLoad.flatMap((resident) => resident._id);

      let applicantIDs = await findApplicantIDsAndCompanyName(IDs);

      const applicants = await findResidentsWithCompany(applicantIDs);

      res.render("unitTeam/tables/applicants", {
        user: req.session.user,
        applicants,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async employees(req, res) {
    try {
      const facility = req.session.user.facility;

      const employees = await Resident.find({
        facility: facility,
        isHired: true,
      }).lean();

      res.render("unitTeam/tables/employees", {
        user: req.session.user,
        employees,
      });
    } catch (err) {
      console.log(err);
    }
  },
  //===============================
  //        REPORTS
  //===============================
  async reports(req, res) {
    try {
      res.render("unitTeam/reports", { user: req.session.user });
    } catch (err) {
      console.log(err);
    }
  },
  async residentReport(req, res) {
    try {
      const facility = req.session.user.facility;
      const selectedFields = Object.keys(req.body);

      if (selectedFields.length === 0) {
        const noData = true;
        return res.render("unitTeam/reports", {
          user: req.session.user,
          noData,
        });
      }

      // Fetch data from MongoDB with only selected fields
      const residents = await Resident.find(
        { facility: facility },
        selectedFields.join(" ")
      ).lean();

      if (residents.length === 0) {
        const noData = true;
        return res.render("unitTeam/reports", {
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
        'attachment; filename="resident_report.csv"'
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
      const facility = req.session.user.facility;
      const selectedFields = Object.keys(req.body);

      if (selectedFields.length === 0) {
        const noData = true;
        return res.render("unitTeam/reports", {
          user: req.session.user,
          noData,
        });
      }

      // Fetch data from MongoDB with only selected fields
      const residents = await Resident.find(
        { facility: facility, isHired: true },
        selectedFields.join(" ")
      ).lean();

      if (residents.length === 0) {
        const noData = true;
        return res.render("unitTeam/reports", {
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
        return res.render("unitTeam/reports", {
          user: req.session.user,
          noData,
        });
      }

      const email = req.session.user.email;

      //find caseload specific to UTM
      const caseLoad = await Resident.find({
        "resume.unitTeam": email,
      }).lean();

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
        return res.render("unitTeam/reports", {
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
