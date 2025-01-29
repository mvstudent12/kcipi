const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");

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
      { $match: { applicants: { $in: IDs } } }, // Filter applicants by residentID array
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
    await Jobs.aggregate([
      { $unwind: "$applicants" }, // Flatten the applicants array
      { $match: { applicants: { $in: IDs } } }, // Filter applicants by residentID array
      {
        $project: {
          applicantID: "$applicants", // Rename applicants to applicantID for clarity
          companyName: 1, // Include the companyName field
        },
      },
      {
        $group: {
          _id: null,
          allApplicants: {
            $push: { applicantID: "$applicantID", companyName: "$companyName" },
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

    console.log(residentsWithCompany);
    return residentsWithCompany;
  } catch (error) {
    console.error("Error fetching residents with company:", error);
    throw error; // Re-throw the error to handle it in the calling code
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
      console.log(interviews);

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

  async residentProfile(req, res) {
    try {
      const residentID = req.params.id;
      const resident = await Resident.findOne({ residentID }).lean();
      const id = resident._id;

      //find positions resident has applied for
      const applications = await Jobs.find({
        applicants: { $in: [id] },
      }).lean();

      const activeTab = "overview";
      res.render("unitTeam/profiles/residentProfile", {
        user: req.session.user,
        resident,
        activeTab,
        applications,
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
      console.log(interviews);

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
      console.log(caseLoad);
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
};
