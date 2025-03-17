//=============================
//    Global Imports
//=============================
const UnitTeam = require("../models/UnitTeam");
const Notification = require("../models/Notification");
const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");
const Link = require("../models/Link");

//=============================
//     Helper Functions
//=============================

const isValidUser = async (token) => {
  try {
    // Find the link data associated with the token
    const linkData = await Link.findOne({ token: token });

    // Check if the token exists and is still valid
    if (!linkData) {
      return false;
    }

    // Check if the token has expired
    if (Date.now() > linkData.tokenExpiration) {
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error with token: ", err);
    throw err;
  }
};

const checkToken = async (token) => {
  try {
    // Find the link data associated with the token
    const linkData = await Link.findOne({ token: token });

    // Check if the token exists and is still valid
    if (!linkData) {
      return false;
    }

    // Check if the token has expired
    if (Date.now() > linkData.tokenExpiration) {
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error with token: ", err);
    throw err;
  }
};

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
  isValidUser,
  checkToken,
};
