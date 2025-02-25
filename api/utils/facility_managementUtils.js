//=============================
//    Global Imports
//=============================
const Notification = require("../models/Notification");
const Resident = require("../models/Resident");
const Company = require("../models/Company");
const Jobs = require("../models/Jobs");

//=============================
//     Helper Functions
//=============================

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

    const includeID = selectedFields.includes("_id");
    const fieldsToSelect = includeID
      ? selectedFields
      : [...selectedFields, "_id"];

    // Find residents with only the selected fields
    const residents = await Resident.find(
      { _id: { $in: applicantIDs }, isActive: true },
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

    return residentsWithDetails;
  } catch (error) {
    console.error("Error fetching residents with details:", error);
    throw error;
  }
};

module.exports = {
  findInterviews,
  findApplicantIDsAndCompanyName,
  findResidentsWithCompany,
  createApplicantsReport,
};
