//=============================
//    Global Imports
//=============================

const Employer = require("../models/Employer");
const Classification = require("../models/Classification");
const Facility_Management = require("../models/Facility_Management");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");
const ActivityLog = require("../models/ActivityLog");

const { createNotification } = require("./notificationUtils");

const { validateResidentID } = require("./validationUtils");

const { createActivityLog } = require("./activityLogUtils");

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
      return;
    }
  } catch (err) {
    console.error("Error fetching employers:", err);
  }
}

async function sendNotificationsToEmployers( //add better error handling
  employerEmails,
  notification_type,
  msg,
  data
) {
  try {
    await Promise.all(
      employerEmails.map((email) =>
        createNotification(email, "employer", notification_type, msg, data)
      )
    );
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

    // fetch positions the resident has applied for
    const jobs = await Jobs.find(
      { "applicants.resident_id": res_id }, // Match applicants by resident ID in the applicants array
      { "applicants.$": 1, companyName: 1, pay: 1 }
    ).lean();

    //fetch resident applications
    const applications = jobs.flatMap((job) =>
      job.applicants.map((applicant) => ({
        ...applicant,
        companyName: job.companyName, // Attach companyName to each applicant
      }))
    );

    // Fetch the unit team, sorted by firstName
    const unitTeam = await UnitTeam.find({ facility: resident.facility })
      .sort({ firstName: 1 })
      .lean();

    //fetch resident activities
    const activities = await ActivityLog.find({ userID: res_id.toString() })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();

    //fetch emails attached to resident's facility

    const classificationEmails = await Classification.find({
      facility: resident.facility,
    }).lean();

    const facility_managementEmails = await Facility_Management.find({
      facility: resident.facility,
    }).lean();

    return {
      resident,
      applications,
      unitTeam,
      activities,
      res_id,
      classificationEmails,
      facility_managementEmails,
    };
  } catch (err) {
    console.log(err);
  }
}

const checkClearanceStatus = async (residentID) => {
  const deptList = [
    "Medical",
    "EAI",
    "Classification",
    "DW",
    "Warden",
    "sexOffender",
    "victimServices",
  ];

  try {
    const resident = await Resident.findOne({ residentID }).lean();
    if (!resident) {
      throw new Error("Resident not found");
    }

    let approvedCount = 0;
    let pendingCount = 0;
    let restrictedCount = 0;
    let noneCount = 0;
    let totalCount = deptList.length;

    // Loop through each department to count status occurrences
    for (const dept of deptList) {
      const status = resident[`${dept}Clearance`]?.status || "none"; // Default to "none" if missing

      if (status === "approved") {
        approvedCount++;
      } else if (status === "restricted") {
        restrictedCount++;
      } else if (status === "pending") {
        pendingCount++;
      } else {
        noneCount++;
      }
    }

    // Determine final status based on counts
    if (restrictedCount > 0) {
      return "restricted"; // If any department is restricted
    } else if (approvedCount === totalCount) {
      return "approved"; // If all departments are approved
    } else if (pendingCount > 0 && restrictedCount === 0) {
      return "pending"; // If at least one is pending but none are restricted
    } else if (approvedCount > 0 && (noneCount > 0 || pendingCount > 0)) {
      return "pending"; // If at least one is approved but the rest are none or pending
    } else {
      return "none"; // Default case if all are none
    }
  } catch (error) {
    console.error("Error checking clearances:", error);
    return "error"; // Return "error" if an exception occurs
  }
};

// Create update data for clearance actions
function createUpdateData(clearance, deptName, name, comments, category) {
  const status = clearance === "true" ? "approved" : "restricted";
  const reason =
    clearance === "true" ? "Clearance approved. ✅" : "Clearance restricted.";
  const note =
    clearance === "true" ? "Approved clearance. ✅" : "Denied clearance. ❌";

  const updateData = {
    $set: {
      [`${deptName}Clearance.status`]: status,
      "workEligibility.status":
        status === "restricted" ? "restricted" : undefined,
      restrictionReason:
        status === "restricted"
          ? `This resident has ${category} restrictions.`
          : undefined,
    },
    $push: {
      [`${deptName}Clearance.clearanceHistory`]: {
        action: status,
        performedBy: name,
        reason: reason,
      },
      [`${deptName}Clearance.notes`]: {
        createdAt: new Date(),
        createdBy: name,
        note: note,
      },
    },
  };

  if (comments) {
    updateData.$push[`${deptName}Clearance.notes`] = {
      createdAt: new Date(),
      createdBy: name,
      note: comments,
    };
  }

  return updateData;
}
// Log activity based on clearance status
async function logClearanceActivity(userId, clearance, category, residentID) {
  const action =
    clearance === "true" ? "clearance_approved" : "clearance_restricted";
  const message =
    clearance === "true"
      ? `Approved ${category} clearance for resident #${residentID}.`
      : `Restricted ${category} clearance for resident #${residentID}.`;

  await createActivityLog(userId.toString(), action, message);
}

// Send notification if clearance is managed outside of caseload
async function sendClearanceNotification(
  resident,
  clearance,
  category,
  adminEmail
) {
  const action =
    clearance === "true" ? "clearance_approved" : "clearance_denied";
  const message =
    clearance === "true"
      ? `${category} clearance approved for resident #${resident.residentID} by ${adminEmail}.`
      : `${category} clearance denied for resident #${resident.residentID} by ${adminEmail}.`;

  await createNotification(
    resident.resume.unitTeam,
    "unitTeam",
    action,
    message,
    `/shared/residentProfile/${resident.residentID}?activeTab=clearance`
  );
}

module.exports = {
  getEmployeeEmails,
  sendNotificationsToEmployers,
  getResidentProfileInfo,
  checkClearanceStatus,
  createUpdateData,
  logClearanceActivity,
  sendClearanceNotification,
};
