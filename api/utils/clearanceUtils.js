//=============================
//    Global Imports
//=============================

const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");
const ActivityLog = require("../models/ActivityLog");

const { createNotification } = require("./notificationUtils");

const { validateResidentID } = require("./validationUtils");

//=============================
//     Helper Functions
//=============================
async function getEmployeeEmails(companyName) {
  try {
    const employers = await Employer.find({ companyName: companyName }).select(
      "email"
    ); // Find by companyName and select only the email field

    if (employers.length > 0) {
      const emails = employers.map((employer) => employer.email); // Extract emails from the results
      return emails;
    } else {
      console.log("No employers found for this company");
    }
  } catch (err) {
    console.error("Error fetching employers:", err);
  }
}

async function sendNotificationsToEmployers( //add better error handling
  employerEmails,
  notification_type,
  msg
) {
  try {
    await Promise.all(
      employerEmails.map((email) =>
        createNotification(email, "employer", notification_type, msg)
      )
    );
    console.log("Notifications sent successfully.");
  } catch (err) {
    console.error("Error sending notifications:", err);
  }
}

async function getResidentProfileInfo(residentID) {
  try {
    validateResidentID(residentID);

    // Find the resident based on residentID
    const resident = await Resident.findOne({ residentID }).lean();
    if (!resident) return null;

    const res_id = resident._id;

    // Find positions the resident has applied for
    const applications = await Jobs.find({
      "applicants.resident_id": res_id, // Match applicants by resident ID in the applicants array
    }).lean();

    // Fetch the unit team, sorted by firstName
    const unitTeam = await UnitTeam.find({ facility: resident.facility })
      .sort({ firstName: 1 })
      .lean();
    const activities = await ActivityLog.find({
      userID: res_id.toString(),
    }).lean();

    return { resident, applications, unitTeam, activities, res_id };
  } catch (err) {
    console.log(err);
  }
}

module.exports = {
  getEmployeeEmails,
  sendNotificationsToEmployers,
  getResidentProfileInfo,
};
