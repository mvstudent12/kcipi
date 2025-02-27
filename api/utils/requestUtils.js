//=============================
//    Global Imports
//=============================
const UnitTeam = require("../models/UnitTeam");
const Notification = require("../models/Notification");
const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");

//=============================
//     Helper Functions
//=============================

function getNameFromEmail(email) {
  const regex = /^([a-z]+)\.([a-z]+)@/i; // Matches "first.last@" pattern
  const match = email.match(regex);

  if (match) {
    const firstName = capitalize(match[1]);
    const lastName = capitalize(match[2]);
    return `${firstName} ${lastName}`;
  }
  return email;
}

function capitalize(name) {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

const getAllApplicantsByResidentID = async (jobID, resID) => {
  try {
    const job = await Jobs.findOne(
      { _id: jobID },
      { applicants: { $elemMatch: { resident_id: resID } } } // Returns all matching applicants
    );

    return job ? job.applicants : [];
  } catch (error) {
    console.error("Error fetching applicants:", error);
    throw error;
  }
};

const mapDepartmentName = (dept) => {
  switch (dept) {
    case "Sex-Offender":
      return "sexOffender";
    case "Victim-Services":
      return "victimServices";
    case "Deputy-Warden":
      return "DW";
    default:
      return dept; // If no match, return the original value
  }
};

const mapDepartmentNameReverse = (dept) => {
  switch (dept) {
    case "sexOffender":
      return "Sex-Offender";
    case "victimServices":
      return "Victim-Services";
    case "DW":
      return "Deputy-Warden";
    default:
      return dept; // If no match, return the original value
  }
};

module.exports = {
  getNameFromEmail,
  capitalize,
  getAllApplicantsByResidentID,
  mapDepartmentName,
  mapDepartmentNameReverse,
};
