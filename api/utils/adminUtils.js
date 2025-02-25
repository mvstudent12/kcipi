//=============================
//    Global Imports
//=============================
const Admin = require("../models/Admin");
const Facility_Management = require("../models/Facility_Management");
const Classification = require("../models/Classification");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");

const bcrypt = require("bcryptjs");

const updateAdminPasswordById = async (adminID, newPassword) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  const result = await Admin.findByIdAndUpdate(
    adminID, // Find the admin by adminID (_id)
    { password: hashedPassword }, // Update the password
    { new: true } // Return the updated document
  );

  if (result) {
    return result;
  } else {
    throw Error("Admin not found");
  }
};

const updateUnitTeamPasswordById = async (unitTeamID, newPassword) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  const result = await UnitTeam.findByIdAndUpdate(
    unitTeamID, // Find the unitTeam by unitTeamID (_id)
    { password: hashedPassword }, // Update the password
    { new: true } // Return the updated document
  );

  if (result) {
    return result;
  } else {
    throw Error("Unit Team Member not found");
  }
};

const updateEmployerPasswordById = async (employerID, newPassword) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  const result = await Employer.findByIdAndUpdate(
    employerID, // Find the employer by employerID (_id)
    { password: hashedPassword }, // Update the password
    { new: true } // Return the updated document
  );

  if (result) {
    return result;
  } else {
    throw Error("Employer not found");
  }
};

const updateClassificationPasswordById = async (
  classificationID,
  newPassword
) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  const result = await Classification.findByIdAndUpdate(
    classificationID, // Find the classification by classificationID (_id)
    { password: hashedPassword }, // Update the password
    { new: true } // Return the updated document
  );

  if (result) {
    return result;
  } else {
    throw Error("No classification member found");
  }
};

const updateFacility_ManagementPasswordById = async (
  facility_managementID,
  newPassword
) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  const result = await Facility_Management.findByIdAndUpdate(
    facility_managementID, // Find the facility_management by facility_managementID (_id)
    { password: hashedPassword }, // Update the password
    { new: true } // Return the updated document
  );

  if (result) {
    return result;
  } else {
    throw Error("No facility_management member found");
  }
};

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
  getAllInterviews,
  findApplicantIDsAndCompanyName,
  createApplicantsReport,
  updateAdminPasswordById,
  updateEmployerPasswordById,
  updateUnitTeamPasswordById,
  updateClassificationPasswordById,
  updateFacility_ManagementPasswordById,
};
