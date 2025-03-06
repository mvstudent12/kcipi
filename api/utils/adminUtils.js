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
      {
        companyName: 1,
        "applicants.interview": 1,
        "applicants.residentName": 1,
        _id: 0,
      }
    ).lean();

    const interviews = jobs.flatMap((job) =>
      job.applicants
        .filter((applicant) => applicant.interview?.status !== "none") // Filter out empty interviews
        .map((applicant) => ({
          companyName: job.companyName, // Attach companyName to each interview
          residentName: applicant.residentName, // Attach resident name
          ...applicant.interview, // Spread interview details
        }))
    );

    return interviews;
  } catch (error) {
    console.error("Error fetching interviews:", error);
    return []; // Return an empty array on error to avoid undefined
  }
}

module.exports = {
  getAllInterviews,

  updateAdminPasswordById,
  updateEmployerPasswordById,
  updateUnitTeamPasswordById,
  updateClassificationPasswordById,
  updateFacility_ManagementPasswordById,
};
