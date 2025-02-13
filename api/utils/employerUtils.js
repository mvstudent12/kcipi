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

// add total number of available job positions needed to fill
function getTotalAvailablePositions(jobsArray) {
  if (!Array.isArray(jobsArray)) {
    throw new Error("Input must be an array");
  }

  return jobsArray.reduce((total, job) => {
    // Ensure job has availablePositions and it's a valid number
    if (job && typeof job.availablePositions === "number") {
      return total + job.availablePositions;
    }
    return total; // Skip invalid or missing availablePositions
  }, 0);
}

//find jobs in company
const findJobs = async (companyName) => {
  //find company by name to get the _id value
  const company = await Company.findOne({
    companyName: companyName,
  }).lean();

  //declare companyID
  const companyID = company._id;

  //find jobs with companyID
  const jobs = await Jobs.find({ companyID }).lean();
  return jobs;
};

const findCompanyID = async (companyName) => {
  try {
    const company = await Company.findOne({ companyName }).lean();

    // If company isn't found, throw an error
    if (!company) {
      throw new Error(`Company with name "${companyName}" not found.`);
    }

    return company._id; // Return company ID if found
  } catch (err) {
    console.error("Error finding company:", err.message);
    throw new Error("An error occurred while retrieving the company ID.");
  }
};

const findResident = async (residentID) => {
  try {
    const resident = await Resident.findOne({ residentID }).lean();

    // If the resident isn't found, throw a custom error
    if (!resident) {
      throw new Error(`Resident with ID ${residentID} not found.`);
    }

    return resident;
  } catch (err) {
    console.error("Error finding resident:", err.message);
    throw new Error("An error occurred while retrieving the resident.");
  }
};

const getResidentApplications = async (companyID, residentID) => {
  try {
    const jobs = await Jobs.find(
      { companyID, "applicants.resident_id": residentID }, // Find jobs where the resident applied
      {
        "applicants.$": 1,
        companyName: 1,
        position: 1,
        pay: 1,
        interviews: 1,
      } // Return only the matching applicants and job details
    ).lean();

    return jobs;
  } catch (error) {
    console.error("Error fetching resident applications:", error);
    throw error;
  }
};

async function findResidentsFromInterviews(companyID) {
  try {
    // Find jobs for the given companyID and get interviews
    const jobs = await Jobs.find({ companyID }).select("interviews").lean();

    // Extract residentIDs along with interview details
    const interviewData = jobs.flatMap((job) =>
      job.interviews.map((interview) => ({
        residentID: interview.residentID,
        dateRequested: interview.dateRequested,
        dateScheduled: interview.dateScheduled,
      }))
    );

    // Fetch resident details for all interview data (including duplicates)
    const residents = await Resident.find({
      residentID: { $in: interviewData.map((i) => i.residentID) }, // Use all residentIDs without checking for uniqueness
    })
      .select(
        "firstName lastName residentID facility outDate jobPool custodyLevel unitTeam"
      )
      .lean();

    // Map resident details with interview data
    const result = interviewData.map((interview) => {
      const resident = residents.find(
        (r) => r.residentID === interview.residentID
      );
      return {
        dateRequested: interview?.dateRequested,
        dateScheduled: interview?.dateScheduled,
        ...(resident || null), // Merge interview with resident data
      };
    });

    return result;
  } catch (error) {
    console.error("Error fetching residents from interviews:", error);
    throw error;
  }
}

async function findApplicantsByCompany(companyID) {
  try {
    // Find jobs for the given companyID and get applicants
    const jobs = await Jobs.find({ companyID })
      .select("companyName applicants") // Fetch only relevant fields
      .lean();

    // Extract applicant resident_ids along with dateApplied and companyName
    const applicantData = jobs.flatMap((job) =>
      job.applicants.map((applicant) => ({
        resident_id: applicant.resident_id, // Updated field
        dateApplied: applicant.dateApplied,
        companyName: job.companyName,
      }))
    );

    // Fetch resident details for all applicantData (including duplicates)
    const residents = await Resident.find({
      _id: { $in: applicantData.map((a) => a.resident_id) }, // Use all resident_ids from applicantData (no deduplication)
    })
      .select(
        "firstName lastName residentID facility outDate jobPool custodyLevel unitTeam"
      )
      .lean();

    // Map resident details with applicant data, without removing duplicates
    const result = applicantData.map((applicant) => {
      const resident = residents.find(
        (r) => r._id.toString() === applicant.resident_id.toString()
      );
      return {
        dateApplied: applicant?.dateApplied,
        companyName: applicant?.companyName,
        ...(resident || null), // Merge applicant with resident data
      };
    });

    return result;
  } catch (error) {
    console.error("Error fetching applicants from company:", error);
    throw error;
  }
}

module.exports = {
  getTotalAvailablePositions,
  findJobs,
  findCompanyID,
  findResident,
  getResidentApplications,
  findResidentsFromInterviews,
  findApplicantsByCompany,
};
